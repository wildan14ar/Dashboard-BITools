import logging
import time

from sqlalchemy import text

from src.config import MAX_ROWS_HARD, TIMEOUT_SEC_HARD
from src.engine.cache import (
    cache_key,
)
from src.engine.cache import (
    delete as cache_delete,
)
from src.engine.cache import (
    get as cache_get,
)
from src.engine.cache import (
    set as cache_set,
)
from src.engine.factory import engine_pool
from src.engine.introspector import get_schema
from src.engine.sanitizer import apply_params, is_safe

logger = logging.getLogger(__name__)


def execute_query(
    source_id: str,
    sql: str,
    db_type: str = "postgresql",
    config_json: str = "{}",
    max_rows: int = 1000,
    timeout_sec: int = 30,
    params: dict[str, str] | None = None,
    use_cache: bool = True,
    limit: int | None = None,
    offset: int = 0,
) -> dict:
    if not is_safe(sql):
        raise PermissionError("Query blocked by sanitizer")

    sql = apply_params(sql, params or {})
    max_rows = min(max_rows, MAX_ROWS_HARD)
    timeout_sec = min(timeout_sec, TIMEOUT_SEC_HARD)

    base_sql = sql.rstrip().rstrip(";").strip()
    if limit is not None and limit > 0:
        # ponytail: appends LIMIT/OFFSET; breaks if the dataset SQL already
        # ends with LIMIT, and the COUNT subquery can't wrap EXPLAIN/SHOW.
        # Use a windowed subquery if that ever bites.
        sql = f"{base_sql} LIMIT {min(int(limit), max_rows)} OFFSET {int(offset or 0)}"

    key = cache_key(source_id, sql) if use_cache and not params else None

    if key:
        cached = cache_get(key)
        if cached is not None:
            logger.info(f"Cache hit: {source_id}")
            cached["cached"] = True
            return cached

    engine = engine_pool.get(source_id, db_type, config_json)
    start = time.monotonic()

    with engine.connect() as conn:
        total = None
        if limit is not None and limit > 0:
            total = conn.execute(
                text(f"SELECT COUNT(*) FROM ({base_sql}) AS _fyc_count")
            ).scalar()
        result = conn.execute(
            text(sql).execution_options(max_row_count=max_rows, timeout=timeout_sec)
        )
        columns = list(result.keys())
        rows = [list(map(str, row)) for row in result.fetchall()]

    elapsed = (time.monotonic() - start) * 1000
    output = {
        "columns": columns,
        "row_count": len(rows),
        "total": int(total) if total is not None else len(rows),
        "execution_time_ms": round(elapsed, 2),
        "rows": rows,
        "cached": False,
    }

    if key:
        cache_set(key, output)

    return output


def invalidate_cache(dataset_id: str) -> dict:
    cache_delete(dataset_id)
    return {"ok": True}


def test_connection(db_type: str, config_json: str) -> dict:
    ok, error = engine_pool.test(db_type, config_json)
    return {"ok": ok, "error": error or ""}


def get_schema_info(source_id: str, db_type: str, config_json: str) -> dict:
    engine = engine_pool.get(source_id, db_type, config_json)
    tables = get_schema(engine)
    return {"tables": tables}
