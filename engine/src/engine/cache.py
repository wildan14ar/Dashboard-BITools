import hashlib
import json
import logging
import os
import time

import redis

from src.config import REDIS_URL

logger = logging.getLogger(__name__)

_ttl_default = int(os.getenv("QUERY_CACHE_TTL_SEC", "300"))
_stale_window = int(os.getenv("QUERY_CACHE_STALE_WINDOW_SEC", "600"))

_redis: redis.Redis | None = None


def _get_redis() -> redis.Redis | None:
    global _redis
    if _redis is None:
        try:
            _redis = redis.from_url(REDIS_URL, socket_connect_timeout=2)
            _redis.ping()
            logger.info(f"Redis connected: {REDIS_URL}")
        except Exception:
            logger.warning("Redis unavailable, cache disabled")
            _redis = False  # type: ignore
            return None
    return _redis if _redis is not False else None  # type: ignore


def cache_key(source_id: str, sql: str) -> str:
    raw = f"qcache:{source_id}:{sql}"
    return hashlib.md5(raw.encode()).hexdigest()


def get(key: str) -> dict | None:
    data = _load(key)
    if data and time.time() - data.get("cached_at", 0) <= _ttl_default:
        return data
    return None


def get_stale(key: str) -> dict | None:
    data = _load(key)
    if data and time.time() - data.get("cached_at", 0) <= _ttl_default + _stale_window:
        return data
    return None


def set(key: str, value: dict, ttl: int = _ttl_default):
    r = _get_redis()
    if r is None:
        return
    try:
        payload = {**value, "cached_at": time.time()}
        r.setex(key, ttl + _stale_window, json.dumps(payload, default=str))
    except Exception as e:
        logger.error(f"Redis set error: {e}")


def _load(key: str) -> dict | None:
    r = _get_redis()
    if r is None:
        return None
    try:
        data = r.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.error(f"Redis get error: {e}")
    return None


def try_lock(key: str, lease_sec: int = 60) -> bool:
    r = _get_redis()
    if r is None:
        return False
    try:
        return bool(r.set(f"{key}:lock", "1", nx=True, ex=lease_sec))
    except Exception as e:
        logger.error(f"Redis lock error: {e}")
        return False


def release_lock(key: str):
    r = _get_redis()
    if r is None:
        return
    try:
        r.delete(f"{key}:lock")
    except Exception as e:
        logger.error(f"Redis unlock error: {e}")


def delete(key: str):
    r = _get_redis()
    if r is None:
        return
    try:
        r.delete(key)
    except Exception as e:
        logger.error(f"Redis delete error: {e}")


def invalidate_pattern(pattern: str):
    r = _get_redis()
    if r is None:
        return
    try:
        keys = r.keys(pattern)
        if keys:
            r.delete(*keys)
            logger.info(f"Invalidated {len(keys)} cache keys")
    except Exception as e:
        logger.error(f"Redis invalidate error: {e}")
