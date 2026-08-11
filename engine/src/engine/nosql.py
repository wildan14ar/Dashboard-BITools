import json
import logging
import urllib.parse
import urllib.request

from src.engine.factory import mongo_pool

logger = logging.getLogger(__name__)


def _mongo_db(client, config_json: str):
    config = json.loads(config_json) if isinstance(config_json, str) else config_json
    return client[config.get("database", "test")]


def _sort_spec(spec):
    # ponytail: accepts JSON-friendly forms: [{field,dir}], [[field,dir]], {field:dir},
    # or a bare {field:1} dict. None = natural order.
    if not spec:
        return None
    if isinstance(spec, dict):
        return [(k, int(v)) for k, v in spec.items()]
    items = []
    for entry in spec:
        if isinstance(entry, dict):
            for k, v in entry.items():
                items.append((k, int(v)))
        elif isinstance(entry, (list, tuple)) and len(entry) == 2:
            items.append((entry[0], int(entry[1])))
        else:
            items.append((entry, 1))
    return items


def run_mongo(
    source_id: str,
    config_json: str,
    spec_json: str,
    max_rows: int,
    limit: int | None,
    offset: int,
) -> tuple[list[str], list[list[str]], int]:
    spec = json.loads(spec_json) if spec_json else {}
    coll_name = spec.get("collection")
    if not coll_name:
        raise ValueError("MongoDB spec requires 'collection'")

    client = mongo_pool.get(source_id, config_json)
    coll = _mongo_db(client, config_json)[coll_name]

    cursor = coll.find(spec.get("filter") or {}, spec.get("projection") or {})
    sort = _sort_spec(spec.get("sort"))
    if sort:
        cursor = cursor.sort(sort)
    skip = int(offset or 0)
    if skip:
        cursor = cursor.skip(skip)
    cap = min(int(limit or spec.get("limit") or 0), max_rows)
    if cap:
        cursor = cursor.limit(cap)

    docs = [dict(d) for d in cursor]

    columns: list[str] = []
    rows: list[list[str]] = []
    for doc in docs:
        if not columns:
            columns = list(doc.keys())
        rows.append(["" if v is None else str(v) for v in doc.values()])

    # stable projection order for empty result
    if not columns and spec.get("projection"):
        columns = list(spec["projection"].keys())

    return columns, rows, len(rows)


def get_schema_info(source_id: str, config_json: str) -> dict:
    client = mongo_pool.get(source_id, config_json)
    db = _mongo_db(client, config_json)
    names = db.list_collection_names()
    return {
        "tables": [
            {"name": n, "schema": db.name, "type": "collection", "columns": []}
            for n in sorted(names)
        ]
    }


def run_api(
    config_json: str,
    spec_json: str,
    params: dict[str, str],
    max_rows: int,
    timeout_sec: int,
    limit: int | None,
    offset: int,
) -> tuple[list[str], list[list[str]], int]:
    config = json.loads(config_json) if isinstance(config_json, str) else config_json
    base_url = (config.get("base_url") or "").rstrip("/")
    method = (config.get("method") or "GET").upper()
    headers = config.get("headers") or {}

    # spec_json is the path template (with {param} placeholders) from BiDataset.sql
    path = (spec_json or config.get("path") or "").lstrip("/")
    for k, v in (params or {}).items():
        path = path.replace("{" + k + "}", urllib.parse.quote(str(v)))

    url = f"{base_url}/{path}" if base_url else f"/{path}"
    req = urllib.request.Request(url, method=method, headers=headers)

    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        data = json.loads(resp.read().decode() or "null")

    if isinstance(data, dict):
        # unwrap a single envelope key holding a list, else treat whole dict as one row
        list_vals = [v for v in data.values() if isinstance(v, list)]
        data = list_vals[0] if len(list_vals) == 1 and isinstance(data, dict) else data

    if not isinstance(data, list):
        data = [data] if data is not None else []

    start = int(offset or 0)
    end = min(len(data), start + (int(limit) if limit else max_rows))
    items = data[start:end]

    columns: list[str] = []
    rows: list[list[str]] = []
    for item in items:
        if isinstance(item, dict):
            if not columns:
                columns = list(item.keys())
            rows.append(["" if v is None else str(v) for v in item.values()])
        else:
            columns = columns or ["value"]
            rows.append(["" if item is None else str(item)])

    return columns, rows, len(rows)
