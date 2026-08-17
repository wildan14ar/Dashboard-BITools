from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import Engine, create_engine, text

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)


@register("sqlite")
class SQLiteEngine(BaseEngine):
    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        path = config.get("path", ":memory:")
        self._engine: Engine = create_engine(
            f"sqlite:///{path}" if path != ":memory:" else "sqlite://",
            echo=False,
        )
        logger.info(f"Created sqlite engine for [{source_id}]")

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
        logger.info(f"Disposed sqlite engine [{self._source_id}]")

    def ping(self) -> bool:
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
