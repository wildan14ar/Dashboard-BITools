from __future__ import annotations

import logging

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

    def fetch_all(
        self, sql: str, params: dict | None = None, timeout_sec: int | None = None
    ) -> list[dict]:
        # Read-only berlapis: sanitizer (executor) + PRAGMA query_only level
        # koneksi + rollback eksplisit. Lolos sanitizer pun tetap tak bisa tulis.
        import time

        with self._engine.connect() as conn:
            conn.execute(text("PRAGMA query_only=ON"))
            deadline = time.monotonic() + timeout_sec if timeout_sec else None
            raw = None
            try:
                # Best-effort abort query SQLite yang kelewat batas waktu.
                raw = conn.connection.driver_connection
                if deadline is not None:
                    raw.set_progress_handler(
                        lambda: 0 if time.monotonic() < deadline else 1, 1000
                    )
                result = conn.execute(text(sql), params or {})
                return [dict(r._mapping) for r in result.fetchall()]
            finally:
                try:
                    if raw is not None:
                        raw.set_progress_handler(None, 0)
                except Exception:
                    logger.debug("Could not clear SQLite progress handler")
                conn.rollback()

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
