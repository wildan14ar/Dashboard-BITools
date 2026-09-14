from __future__ import annotations

import logging
import os
from urllib.parse import quote_plus

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.pool import QueuePool

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)


@register("mysql")
@register("mariadb")
class MysqlEngine(BaseEngine):
    """Konektor MySQL/MariaDB via pymysql. Read-only (SET TRANSACTION READ ONLY)."""

    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        host = config.get("host", "localhost")
        port = config.get("port", 3306)
        user = config.get("user", "")
        password = config.get("password", "")
        database = config.get("database", "")

        creds = f"{quote_plus(str(user))}:{quote_plus(str(password))}@" if user else ""
        url = f"mysql+pymysql://{creds}{host}:{port}/{database}?charset=utf8mb4"

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
        logger.info(f"Created mysql engine for [{source_id}]")

    def fetch_all(
        self, sql: str, params: dict | None = None, timeout_sec: int | None = None
    ) -> list[dict]:
        # Read-only berlapis: sanitizer (executor) + transaksi READ ONLY level
        # database + rollback eksplisit.
        with self._engine.connect() as conn:
            conn.execute(text("SET TRANSACTION READ ONLY"))
            if timeout_sec:
                conn.execute(
                    text(f"SET SESSION MAX_EXECUTION_TIME={int(timeout_sec) * 1000}")
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
        logger.info(f"Disposed mysql engine [{self._source_id}]")

    def ping(self) -> bool:
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
