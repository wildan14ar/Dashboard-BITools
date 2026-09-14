from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)

_PATH_PARAM_RE = re.compile(r"\{(\w+)\}")


def _substitute_path(template: str, params: dict) -> tuple[str, dict]:
    """Ganti {key} di path dengan nilai URL-quoted; sisa params jadi query string."""

    def repl(m: re.Match) -> str:
        key = m.group(1)
        if key not in params:
            raise ValueError(f"Missing path parameter: {key}")
        return urllib.parse.quote(str(params[key]), safe="")

    used: set[str] = set()

    def track(m: re.Match) -> str:
        used.add(m.group(1))
        return repl(m)

    path = _PATH_PARAM_RE.sub(track, template)
    rest = {k: v for k, v in params.items() if k not in used}
    return path, rest


def _normalize(payload: Any) -> list[dict]:
    if isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict):
        rows = [payload]
    else:
        raise TypeError(f"Unsupported API response type: {type(payload).__name__}")
    if any(not isinstance(r, dict) for r in rows):
        raise ValueError("API response rows must be objects")
    return rows


@register("api")
@register("restfull")
class RestApiEngine(BaseEngine):
    """Konektor REST: fetch_all(path_template, params) -> GET base_url + path."""

    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        self._base_url = str(config.get("base_url", "")).rstrip("/")
        self._headers = dict(config.get("headers", {}) or {})
        self._timeout = float(config.get("timeout", 10))
        logger.info(f"Created REST API engine for [{source_id}] {self._base_url}")

    def _get(self, path: str, timeout: float | None = None) -> Any:
        url = f"{self._base_url}{path if path.startswith('/') else '/' + path}"
        req = urllib.request.Request(
            url, headers={"Accept": "application/json", **self._headers}
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout or self._timeout) as resp:
                if not 200 <= resp.status < 300:
                    raise RuntimeError(f"API returned status {resp.status} for {url}")
                return json.loads(resp.read().decode("utf-8") or "null")
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"API error {e.code} for {url}: {e.reason}") from e
        except urllib.error.URLError as e:
            raise ConnectionError(f"Cannot reach API {url}: {e.reason}") from e

    def fetch_all(
        self, sql: str, params: dict | None = None, timeout_sec: int | None = None
    ) -> list[dict]:
        if not self._base_url:
            raise ValueError("REST API source requires 'base_url' in config")
        path, rest = _substitute_path(sql, params or {})
        if rest:
            path += ("&" if "?" in path else "?") + urllib.parse.urlencode(
                {k: str(v) for k, v in rest.items()}
            )
        timeout = float(timeout_sec) if timeout_sec else None
        return _normalize(self._get(path, timeout))

    def close(self) -> None:
        pass

    def ping(self) -> bool:
        try:
            self._get("/")
            return True
        except Exception:
            return False
