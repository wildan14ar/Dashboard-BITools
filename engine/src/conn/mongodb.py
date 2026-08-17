from __future__ import annotations

import json
import logging
from typing import Any

from pymongo import MongoClient

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)


@register("mongodb")
class MongoEngine(BaseEngine):
    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        uri = config.get("connection_string", "mongodb://localhost:27017")
        self._db_name = config.get("database", "test")
        self._client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        logger.info(f"Created mongo engine for [{source_id}]")

    @property
    def _db(self):
        return self._client[self._db_name]

    def execute(self, sql: str, params: dict | None = None) -> Any:
        spec = json.loads(sql) if isinstance(sql, str) else sql
        coll_name = spec.get("collection")
        if not coll_name:
            raise ValueError("MongoDB execute requires 'collection' in spec")
        coll = self._db[coll_name]
        op = spec.get("operation", "insertOne")
        if op == "insertOne":
            coll.insert_one(spec.get("document", {}))
        elif op == "updateOne":
            coll.update_one(spec.get("filter", {}), spec.get("update", {}))
        elif op == "deleteOne":
            coll.delete_one(spec.get("filter", {}))

    def fetch_all(self, sql: str, params: dict | None = None) -> list[dict]:
        spec = json.loads(sql) if isinstance(sql, str) else sql
        coll_name = spec.get("collection")
        if not coll_name:
            raise ValueError("MongoDB fetch requires 'collection' in spec")
        cursor = self._db[coll_name].find(
            spec.get("filter") or {}, spec.get("projection") or {}
        )
        if spec.get("sort"):
            sort = [(k, int(v)) for k, v in spec["sort"].items()]
            cursor = cursor.sort(sort)
        if spec.get("limit"):
            cursor = cursor.limit(int(spec["limit"]))
        return [dict(d) for d in cursor]

    def close(self) -> None:
        self._client.close()
        logger.info(f"Closed mongo engine [{self._source_id}]")

    def ping(self) -> bool:
        try:
            self._client.admin.command("ping")
            return True
        except Exception:
            return False
