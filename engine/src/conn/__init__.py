from __future__ import annotations

import importlib
import json
import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class Engine(ABC):
    """Base interface for all DB connectors. Engine ini READ-ONLY:
    fetch_all hanya boleh membaca (konektor SQL wajib menegakkannya di level
    sesi + rollback), execute() untuk tulis harus menolak dengan PermissionError.
    """

    @abstractmethod
    def __init__(self, source_id: str, config: dict) -> None: ...

    @abstractmethod
    def execute(self, sql: str, params: dict | None = None) -> Any:
        """Jalur tulis — konektor read-only wajib raise PermissionError."""
        ...

    @abstractmethod
    def fetch_all(self, sql: str, params: dict | None = None) -> Any: ...

    @abstractmethod
    def close(self) -> None: ...

    @abstractmethod
    def ping(self) -> bool: ...

    def dispose(self) -> None:
        self.close()

    @property
    def sa_engine(self):
        """Return underlying SQLAlchemy Engine if available (SQL types only)."""
        return None


_REGISTRY: dict[str, type[Engine]] = {}


def register(db_type: str):
    """Decorator to register an engine class by db_type."""

    def wrapper(cls: type[Engine]):
        _REGISTRY[db_type] = cls
        return cls

    return wrapper


def create(db_type: str, source_id: str, config_json: str) -> Engine:
    """Create an engine instance for the given db_type."""
    cls = _REGISTRY.get(db_type)
    if cls is None:
        raise ValueError(f"Unknown db_type: {db_type!r}. Available: {list(_REGISTRY)}")
    config = json.loads(config_json) if isinstance(config_json, str) else config_json
    return cls(source_id=source_id, config=config)


# Conditional imports — each module registers its @register decorator side-effect.
# Missing optional dependencies are silently skipped.
for _mod in (
    "postgres",
    "mysql",
    "mssql",
    "clickhouse",
    "bigquery",
    "mariadb",
    "mongodb",
    "restfull",
    "sqlite",
):
    try:
        importlib.import_module(f".{_mod}", package=__package__)
    except ImportError:
        pass
