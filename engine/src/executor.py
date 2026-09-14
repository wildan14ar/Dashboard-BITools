import json
import logging
import time

from src import conn as conn_mod
from src.cache import (
    cache_key,
)
from src.cache import (
    get as cache_get,
)
from src.cache import (
    get_stale as cache_get_stale,
)
from src.cache import (
    invalidate_pattern as cache_invalidate_pattern,
)
from src.cache import (
    release_lock as cache_release_lock,
)
from src.cache import (
    set as cache_set,
)
from src.cache import (
    try_lock as cache_try_lock,
)
from src.config import MAX_ROWS_HARD, TIMEOUT_SEC_HARD
from src.introspector import get_schema
from src.sanitizer import bind_params, is_safe

logger = logging.getLogger(__name__)

NON_SQL_TYPES = {"mongodb", "api"}


def _adapt_results(rows: list[dict]) -> tuple[list[str], list[list[str]]]:
    """Convert list[dict] rows to (columns, rows) format for output."""
    if not rows:
        return [], []
    columns = list(rows[0].keys())
    str_rows = [[str(cell) for cell in row.values()] for row in rows]
    return columns, str_rows


def execute_query(
    source_id: str,
    sql: str,
    db_type: str = "postgresql",
    config_json: str = "{}",
    max_rows: int = 1000,
    timeout_sec: int = 30,
    params: dict[str, str] | None = None,
    use_cache: bool = True,
) -> dict:
    non_sql = db_type in NON_SQL_TYPES
    bound: dict[str, str] = dict(params or {})

    if not non_sql:
        if not is_safe(sql):
            raise PermissionError("Query blocked by sanitizer")
        # {{name}} -> :name bound params; driver yang meng-escape nilai.
        sql, bound = bind_params(sql, params or {})

    max_rows = min(max_rows, MAX_ROWS_HARD)
    timeout_sec = min(timeout_sec, TIMEOUT_SEC_HARD)

    sql = sql.rstrip().rstrip(";").strip()
    # Cache key mencakup nilai param agar filter berbeda tidak berbagi cache.
    cacheable = (
        sql
        if not bound
        else f"{sql}\n--params:{json.dumps(bound, sort_keys=True, default=str)}"
    )
    key = cache_key(source_id, cacheable) if use_cache else None

    refresh_lease = False
    if key:
        cached = cache_get(key)
        if cached is not None:
            logger.info(f"Cache hit: {source_id}")
            cached["cached"] = True
            return cached
        stale = cache_get_stale(key)
        if stale is not None and not cache_try_lock(key):
            logger.info(f"Stale serve: {source_id}")
            stale["cached"] = True
            return stale
        refresh_lease = stale is not None

    start = time.monotonic()
    engine = conn_mod.create(db_type, source_id, config_json)

    try:
        result_rows = engine.fetch_all(sql, bound)
        result_rows = result_rows[:max_rows]
        columns, rows = _adapt_results(result_rows)
    finally:
        engine.close()

    elapsed = (time.monotonic() - start) * 1000
    output = {
        "columns": columns,
        "row_count": len(rows),
        "total": len(rows),
        "execution_time_ms": round(elapsed, 2),
        "rows": rows,
        "cached": False,
    }

    if key:
        cache_set(key, output)
        if refresh_lease:
            cache_release_lock(key)

    return output


def invalidate_cache(source_id: str) -> dict:
    cache_invalidate_pattern(f"qcache:{source_id}:*")
    cache_invalidate_pattern(f"schema:{source_id}*")
    return {"ok": True}


def test_connection(db_type: str, config_json: str) -> dict:
    engine = conn_mod.create(db_type, "test", config_json)
    try:
        ok = engine.ping()
        return {"ok": ok, "error": "" if ok else "ping failed"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    finally:
        engine.close()


def get_schema_info(source_id: str, db_type: str, config_json: str) -> dict:
    schema_cache_key = f"schema:{source_id}"
    cached = cache_get(schema_cache_key)
    if cached is not None:
        logger.info(f"Schema cache hit: {source_id}")
        return cached

    engine = conn_mod.create(db_type, source_id, config_json)
    try:
        if db_type in NON_SQL_TYPES:
            tables = engine.fetch_all("listCollections")
            result = {"tables": tables}
        else:
            tables = get_schema(engine.sa_engine)
            result = {"tables": tables}
    finally:
        engine.close()

    cache_set(schema_cache_key, result)
    return result
