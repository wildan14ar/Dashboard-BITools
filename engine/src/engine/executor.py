import json
import time
import logging
from typing import Optional
from sqlalchemy import text

from src.engine.factory import engine_pool
from src.engine.sanitizer import is_safe, apply_params
from src.engine.introspector import get_schema
from src.engine.cache import (
    get as cache_get,
    set as cache_set,
    delete as cache_delete,
    cache_key,
)
from src.config import MAX_ROWS_HARD, TIMEOUT_SEC_HARD

logger = logging.getLogger(__name__)


def execute_query(
    source_id: str,
    sql: str,
    db_type: str = "postgresql",
    config_json: str = "{}",
    max_rows: int = 1000,
    timeout_sec: int = 30,
    params: Optional[dict[str, str]] = None,
    use_cache: bool = True,
) -> dict:
    if not is_safe(sql):
        raise PermissionError("Query blocked by sanitizer")

    sql = apply_params(sql, params or {})
    max_rows = min(max_rows, MAX_ROWS_HARD)
    timeout_sec = min(timeout_sec, TIMEOUT_SEC_HARD)

    key = cache_key(source_id, sql) if use_cache and not params else None

    if key:
        cached = cache_get(key)
        if cached is not None:
            logger.info(f"Cache hit: {source_id}")
            return cached

    engine = engine_pool.get(source_id, db_type, config_json)
    start = time.monotonic()

    with engine.connect() as conn:
        result = conn.execute(
            text(sql).execution_options(max_row_count=max_rows, timeout=timeout_sec)
        )
        columns = list(result.keys())
        rows = [list(map(str, row)) for row in result.fetchall()]

    elapsed = (time.monotonic() - start) * 1000
    output = {
        "columns": columns,
        "row_count": len(rows),
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
