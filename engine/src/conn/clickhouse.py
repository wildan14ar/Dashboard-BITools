from __future__ import annotations

import logging
import os
from typing import Any
from urllib.parse import quote_plus

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.pool import QueuePool

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)


@register("clickhouse")
class ClickhouseEngine(BaseEngine):
    """Konektor ClickHouse via clickhouse-sqlalchemy (protokol native).

    Read-only berlapis: sanitizer (executor) + `SET readonly = 1` per sesi +
    tanpa commit + rollback eksplisit. Disarankan juga user khusus readonly
    di sisi server (quota read-only).
    """

    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        host = config.get("host", "localhost")
        port = config.get("port", 9000)
        user = config.get("user", "default")
        password = config.get("password", "")
        database = config.get("database", "default")

        creds = f"{quote_plus(str(user))}:{quote_plus(str(password))}@" if user else ""
        url = f"clickhouse+native://{creds}{host}:{port}/{database}"

        self._engine: Engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
            pool_recycle=300,
            pool_pre_ping=True,
            echo=False,
        )
        logger.info(f"Created clickhouse engine for [{source_id}]")

    def execute(self, sql: str, params: dict | None = None) -> Any:
        raise PermissionError("Query engine is read-only")

    def fetch_all(self, sql: str, params: dict | None = None) -> list[dict]:
        with self._engine.connect() as conn:
            try:
                conn.execute(text("SET readonly = 1"))
            except Exception:
                logger.warning(
                    "Could not set ClickHouse readonly=1; relying on sanitizer"
                )
            try:
                result = conn.execute(text(sql), params or {})
                return [dict(r._mapping) for r in result.fetchall()]
            finally:
                conn.rollback()

    @property
    def sa_engine(self):
        return self._engine

    def close(self) -> None:
        self._engine.dispose()
        logger.info(f"Disposed clickhouse engine [{self._source_id}]")

    def ping(self) -> bool:
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
