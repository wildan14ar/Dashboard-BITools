import logging
import threading

from src.conn import Engine, create

logger = logging.getLogger(__name__)

_cache: dict[str, Engine] = {}
_lock = threading.Lock()


def get(source_id: str, db_type: str, config_json: str) -> Engine:
    """Return cached engine or create + cache one via conn module."""
    engine = _cache.get(source_id)
    if engine is not None:
        return engine

    with _lock:
        engine = _cache.get(source_id)
        if engine is not None:
            return engine

        logger.info(f"Creating engine for [{source_id}] {db_type}")
        engine = create(db_type, source_id, config_json)
        _cache[source_id] = engine
        return engine


def dispose(source_id: str):
    """Dispose a cached engine."""
    engine = _cache.pop(source_id, None)
    if engine:
        logger.info(f"Disposing engine for [{source_id}]")
        engine.dispose()


def test_connection(db_type: str, config_json: str) -> tuple[bool, str | None]:
    """Create a throwaway engine, ping it, close it."""
    try:
        engine = create(db_type, "test", config_json)
        try:
            ok = engine.ping()
            return (True, None) if ok else (False, "ping returned false")
        finally:
            engine.close()
    except Exception as e:
        return False, str(e)


if __name__ == "__main__":
    import concurrent.futures
    import json

    test_config = json.dumps({"path": ":memory:"})

    def _get_engine():
        return get("test_race", "sqlite", test_config)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        engines = list(ex.map(lambda _: _get_engine(), range(20)))

    assert len({id(e) for e in engines}) == 1, (
        "Race: created multiple engines for same source_id"
    )
    print(f"OK: {len(engines)} threads got same engine instance")

    dispose("test_race")
    e2 = get("test_race", "sqlite", test_config)
    assert e2 is not engines[0], "Expected new engine after dispose"
    print("OK: dispose + re-create works")
