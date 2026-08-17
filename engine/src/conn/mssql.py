from __future__ import annotations

import logging
import os
from typing import Any

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.pool import QueuePool

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)


@register("mssql")
class MSSQLEngine(BaseEngine):
    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        host = config.get("host", "localhost")
        port = config.get("port", 1433)
        user = config.get("user", "")
        password = config.get("password", "")
        database = config.get("database", "")
        driver = config.get("driver", "ODBC Driver 18 for SQL Server")

        if user:
            url = f"mssql+pyodbc://{user}:{password}@{host}:{port}/{database}?driver={driver.replace(' ', '+')}&Encrypt=yes&TrustServerCertificate=yes"
        else:
            url = f"mssql+pyodbc://{host}:{port}/{database}?driver={driver.replace(' ', '+')}&Encrypt=yes&TrustServerCertificate=yes&trusted_connection=yes"

        self._engine: Engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
            pool_recycle=300,
            pool_pre_ping=True,
            connect_args={"timeout": 5},
            echo=False,
        )
        logger.info(f"Created mssql engine for [{source_id}]")

    def execute(self, sql: str, params: dict | None = None) -> Any:
        with self._engine.connect() as conn:
            conn.execute(text(sql), params or {})
            conn.commit()

    def fetch_all(self, sql: str, params: dict | None = None) -> list[dict]:
        with self._engine.connect() as conn:
            result = conn.execute(text(sql), params or {})
            return [dict(r._mapping) for r in result.fetchall()]

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
