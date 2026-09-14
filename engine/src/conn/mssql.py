from __future__ import annotations

import logging
import os
from urllib.parse import quote_plus

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.pool import QueuePool

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)


@register("mssql")
class MssqlEngine(BaseEngine):
    """Konektor SQL Server via pymssql (tanpa driver ODBC).

    T-SQL tidak punya mode transaksi READ ONLY level sesi, jadi penguncian
    berlapis di sini = sanitizer (executor) + tanpa commit + rollback eksplisit.
    WAJIB pakai login berhak minimal (db_datareader) di sisi server.
    """

    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        host = config.get("host", "localhost")
        port = config.get("port", 1433)
        user = config.get("user", "")
        password = config.get("password", "")
        database = config.get("database", "")

        creds = f"{quote_plus(str(user))}:{quote_plus(str(password))}@" if user else ""
        url = f"mssql+pymssql://{creds}{host}:{port}/{database}"

        self._engine: Engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
            pool_recycle=300,
            pool_pre_ping=True,
            connect_args={"timeout": 5, "login_timeout": 5},
            echo=False,
        )
        logger.info(f"Created mssql engine for [{source_id}]")

    def fetch_all(
        self, sql: str, params: dict | None = None, timeout_sec: int | None = None
    ) -> list[dict]:
        # T-SQL tak punya mode READ ONLY level sesi: sanitizer + tanpa commit +
        # rollback eksplisit. LOCK_TIMEOUT membatasi tunggu lock; batas total
        # query ditegakkan via deadline gRPC di server.
        with self._engine.connect() as conn:
            if timeout_sec:
                conn.execute(text(f"SET LOCK_TIMEOUT {int(timeout_sec) * 1000}"))
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
        logger.info(f"Disposed mssql engine [{self._source_id}]")

    def ping(self) -> bool:
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
