from __future__ import annotations

import json
import logging
import re
from typing import Any

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)

_PARAM_RE = re.compile(r"\{\{(\w+)\}\}")


def _normalize(doc: dict) -> dict:
    return {
        k: (v if isinstance(v, (str, int, float, bool)) or v is None else str(v))
        for k, v in doc.items()
    }


@register("mongodb")
class MongoEngine(BaseEngine):
    """Konektor MongoDB: command JSON {collection, filter, projection, sort, limit}."""

    def __init__(self, source_id: str, config: dict) -> None:
        from pymongo import MongoClient

        self._source_id = source_id
        self._db_name = config.get("database", "")
        connection_string = config.get("connection_string")
        if not connection_string:
            host = config.get("host", "localhost")
            port = int(config.get("port", 27017))
            creds = ""
            if config.get("username"):
                user = config["username"]
                pwd = config.get("password", "")
                creds = f"{user}:{pwd}@"
            connection_string = f"mongodb://{creds}{host}:{port}"
        # MongoClient lazy-connect: aman dibuat tanpa server hidup.
        self._client = MongoClient(
            connection_string,
            serverSelectionTimeoutMS=int(config.get("timeout", 5)) * 1000,
        )
        logger.info(f"Created mongodb engine for [{source_id}]")

    def execute(self, sql: str, params: dict | None = None) -> Any:
        raise NotImplementedError("MongoDB source is read-only via fetch_all")

    def fetch_all(self, sql: str, params: dict | None = None) -> list[dict]:
        try:
            command = json.loads(
                _PARAM_RE.sub(
                    lambda m: str((params or {}).get(m.group(1), m.group(0))), sql
                )
            )
        except json.JSONDecodeError as e:
            raise ValueError(f"MongoDB command must be valid JSON: {e}") from e
        if not isinstance(command, dict):
            raise TypeError("MongoDB command must be a JSON object")
        collection = (
            (command.get("collection") or "").strip()
            if isinstance(command.get("collection"), str)
            else ""
        )
        if not collection:
            raise ValueError("MongoDB command requires 'collection'")
        if not self._db_name and "." not in collection and not command.get("database"):
            raise ValueError("MongoDB command requires 'database' (config or command)")
        db_name = command.get("database") or self._db_name
        coll = self._client[db_name][collection]
        cursor = coll.find(
            filter=command.get("filter") or {},
            projection=command.get("projection"),
        )
        if command.get("sort"):
            cursor = cursor.sort(command["sort"])
        limit = int(command.get("limit", 1000))
        return [_normalize(doc) for doc in cursor.limit(max(limit, 1))]

    def close(self) -> None:
        self._client.close()

    def ping(self) -> bool:
        try:
            self._client.admin.command("ping")
            return True
        except Exception:
            return False
