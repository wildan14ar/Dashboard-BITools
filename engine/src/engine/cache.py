import hashlib
import json
import logging
from typing import Optional
import redis

from src.config import REDIS_URL

logger = logging.getLogger(__name__)

_ttl_default = int(__import__("os").getenv("QUERY_CACHE_TTL_SEC", "300"))

_redis: Optional[redis.Redis] = None


def _get_redis() -> Optional[redis.Redis]:
    global _redis
    if _redis is None:
        try:
            _redis = redis.from_url(REDIS_URL, socket_connect_timeout=2)
            _redis.ping()
            logger.info(f"Redis connected: {REDIS_URL}")
        except Exception:
            logger.warning(f"Redis unavailable, cache disabled")
            _redis = False  # type: ignore
            return None
    return _redis if _redis is not False else None  # type: ignore


def cache_key(source_id: str, sql: str) -> str:
    raw = f"qcache:{source_id}:{sql}"
    return hashlib.md5(raw.encode()).hexdigest()


def get(key: str) -> Optional[dict]:
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


def set(key: str, value: dict, ttl: int = _ttl_default):
    r = _get_redis()
    if r is None:
        return
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.error(f"Redis set error: {e}")


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
