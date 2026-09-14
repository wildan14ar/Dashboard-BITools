import json

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from src import factory
from src.executor import execute_query


@pytest.fixture
def cfg(tmp_path):
    config_json = json.dumps({"path": str(tmp_path / "ro.db")})
    engine = factory.get("readonly_test", "sqlite", config_json)
    with engine.sa_engine.connect() as conn:
        conn.execute(text("CREATE TABLE items (n INTEGER)"))
        conn.execute(text("INSERT INTO items VALUES (1), (2)"))
        conn.commit()
    yield config_json, engine
    factory.dispose("readonly_test")


def test_execute_query_blocks_write(cfg):
    config_json, _ = cfg
    with pytest.raises(PermissionError, match="blocked by sanitizer"):
        execute_query(
            "readonly_test",
            "DELETE FROM items",
            db_type="sqlite",
            config_json=config_json,
        )
    with pytest.raises(PermissionError, match="blocked by sanitizer"):
        execute_query(
            "readonly_test",
            "INSERT INTO items VALUES (3)",
            db_type="sqlite",
            config_json=config_json,
        )


def test_fetch_all_blocks_write_at_db_level(cfg):
    """Bypass sanitizer (panggil konektor langsung) — PRAGMA query_only tetap menolak."""
    _, engine = cfg
    with pytest.raises(DBAPIError):
        engine.fetch_all("CREATE TABLE evil (n INTEGER)", {})
    with pytest.raises(DBAPIError):
        engine.fetch_all("INSERT INTO items VALUES (99)", {})


def test_data_unchanged_and_readable(cfg):
    config_json, engine = cfg
    # Upaya tulis gagal di atas; data harus utuh dan masih bisa dibaca.
    result = execute_query(
        "readonly_test",
        "SELECT n FROM items ORDER BY n",
        db_type="sqlite",
        config_json=config_json,
    )
    assert [r[0] for r in result["rows"]] == ["1", "2"]
    assert engine.fetch_all("SELECT count(*) AS c FROM items", {})[0]["c"] == 2
