from __future__ import annotations

import logging
import os

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.pool import QueuePool

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)


@register("postgresql")
class PostgresEngine(BaseEngine):
    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        host = config.get("host", "localhost")
        port = config.get("port", 5432)
        user = config.get("user", "")
        password = config.get("password", "")
        database = config.get("database", "")
        params = config.get("params", "")

        creds = f"{user}:{password}@" if user else ""
        url = f"postgresql+psycopg2://{creds}{host}:{port}/{database}{params}"

        self._engine: Engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
            pool_recycle=300,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 5},
            echo=False,
        )
        logger.info(f"Created postgres engine for [{source_id}]")

    def fetch_all(
        self, sql: str, params: dict | None = None, timeout_sec: int | None = None
    ) -> list[dict]:
        # Read-only berlapis: sanitizer (executor) + transaksi READ ONLY level
        # database + rollback eksplisit. Lolos sanitizer pun tetap tak bisa tulis.
        with self._engine.connect() as conn:
            conn.execute(text("SET TRANSACTION READ ONLY"))
            if timeout_sec:
                conn.execute(
                    text(f"SET LOCAL statement_timeout = {int(timeout_sec) * 1000}")
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
        logger.info(f"Disposed postgres engine [{self._source_id}]")

    def ping(self) -> bool:
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
