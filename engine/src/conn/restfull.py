from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request
from typing import Any

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)


@register("api")
class RESTEngine(BaseEngine):
    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        self._base_url = (config.get("base_url") or "").rstrip("/")
        self._method = (config.get("method") or "GET").upper()
        self._headers = config.get("headers") or {}
        self._timeout = int(config.get("timeout", 30))
        logger.info(f"Created rest engine for [{source_id}]")

    def _request(self, path: str, params: dict | None = None) -> Any:
        url = f"{self._base_url}/{path.lstrip('/')}" if self._base_url else f"/{path}"
        req = urllib.request.Request(url, method=self._method, headers=self._headers)
        with urllib.request.urlopen(req, timeout=self._timeout) as resp:
            return json.loads(resp.read().decode() or "null")

    def execute(self, sql: str, params: dict | None = None) -> Any:
        path = (sql or "").lstrip("/")
        for k, v in (params or {}).items():
            path = path.replace("{" + k + "}", urllib.parse.quote(str(v)))
        return self._request(path, params)

    def fetch_all(self, sql: str, params: dict | None = None) -> list[dict]:
        data = self.execute(sql, params)
        if not isinstance(data, list):
            data = [data] if data is not None else []
        return [item for item in data if isinstance(item, dict)]

    def close(self) -> None:
        logger.info(f"Closed rest engine [{self._source_id}]")

    def ping(self) -> bool:
        try:
            self._request("")
            return True
        except Exception:
            return False
