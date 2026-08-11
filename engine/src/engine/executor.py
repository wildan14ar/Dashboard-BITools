import logging
import time

from sqlalchemy import text

from src.config import MAX_ROWS_HARD, TIMEOUT_SEC_HARD
from src.engine.cache import (
    cache_key,
)
from src.engine.cache import (
    get as cache_get,
)
from src.engine.cache import (
    get_stale as cache_get_stale,
)
from src.engine.cache import (
    invalidate_pattern as cache_invalidate_pattern,
)
from src.engine.cache import (
    release_lock as cache_release_lock,
)
from src.engine.cache import (
    set as cache_set,
)
from src.engine.cache import (
    try_lock as cache_try_lock,
)
from src.engine.factory import engine_pool
from src.engine.introspector import get_schema
from src.engine.nosql import get_schema_info as get_mongo_schema_info
from src.engine.nosql import run_api, run_mongo
from src.engine.sanitizer import apply_params, is_safe

logger = logging.getLogger(__name__)

NON_SQL_TYPES = {"mongodb", "api"}


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
    non_sql = db_type in NON_SQL_TYPES

    if not non_sql:
        if not is_safe(sql):
            raise PermissionError("Query blocked by sanitizer")
        sql = apply_params(sql, params or {})

    max_rows = min(max_rows, MAX_ROWS_HARD)
    timeout_sec = min(timeout_sec, TIMEOUT_SEC_HARD)

    base_sql = sql.rstrip().rstrip(";").strip()
    if limit is not None and limit > 0 and not non_sql:
        # ponytail: appends LIMIT/OFFSET; breaks if the dataset SQL already
        # ends with LIMIT, and the COUNT subquery can't wrap EXPLAIN/SHOW.
        # Use a windowed subquery if that ever bites.
        sql = f"{base_sql} LIMIT {min(int(limit), max_rows)} OFFSET {int(offset or 0)}"

    key = cache_key(source_id, sql) if use_cache and not params else None

    # ponytail: stale-while-revalidate — on miss, acquire a refresh lease so
    # only one request re-hits the DB; concurrent callers get the stale entry.
    # No lease on cold start (nothing cached) — first request just runs.
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

    if non_sql:
        if db_type == "mongodb":
            columns, rows, total = run_mongo(
                source_id, config_json, sql, max_rows, limit, offset
            )
        else:
            columns, rows, total = run_api(
                config_json, sql, params or {}, max_rows, timeout_sec, limit, offset
            )
    else:
        engine = engine_pool.get(source_id, db_type, config_json)
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
        if refresh_lease:
            cache_release_lock(key)

    return output


def invalidate_cache(source_id: str) -> dict:
    # ponytail: cache keys are md5("qcache:{source_id}:{sql}") — never match
    # the source_id itself. Invalidate by the qcache prefix scan instead.
    cache_invalidate_pattern(f"qcache:{source_id}:*")
    cache_invalidate_pattern(f"schema:{source_id}*")
    return {"ok": True}


def test_connection(db_type: str, config_json: str) -> dict:
    ok, error = engine_pool.test(db_type, config_json)
    return {"ok": ok, "error": error or ""}


def get_schema_info(source_id: str, db_type: str, config_json: str) -> dict:
    schema_cache_key = f"schema:{source_id}"
    cached = cache_get(schema_cache_key)
    if cached is not None:
        logger.info(f"Schema cache hit: {source_id}")
        return cached

    if db_type == "mongodb":
        result = get_mongo_schema_info(source_id, config_json)
    else:
        engine = engine_pool.get(source_id, db_type, config_json)
        tables = get_schema(engine)
        result = {"tables": tables}

    cache_set(schema_cache_key, result)
    return result
