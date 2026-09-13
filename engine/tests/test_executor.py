import copy
import json

import pytest
from sqlalchemy import text

from src import executor as exec_mod
from src import factory
from src.executor import execute_query

SQL = "SELECT * FROM nums ORDER BY n"


@pytest.fixture
def cfg(tmp_path):
    config_json = json.dumps({"path": str(tmp_path / "test.db")})
    engine = factory.get("pagination_test", "sqlite", config_json)
    with engine.sa_engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS nums"))
        conn.execute(text("CREATE TABLE nums (n INTEGER)"))
        conn.execute(
            text("INSERT INTO nums VALUES (:n)"), [{"n": i} for i in range(50)]
        )
        conn.commit()
    yield config_json
    factory.dispose("pagination_test")


def test_fetch_all_rows(cfg):
    result = execute_query(
        "pagination_test", SQL, db_type="sqlite", config_json=cfg, use_cache=False
    )

    assert [r[0] for r in result["rows"]] == [str(i) for i in range(50)]
    assert len(result["rows"]) == 50
    assert result["row_count"] == 50
    assert result["total"] == 50


def test_cache_flag(cfg, monkeypatch):
    cache: dict = {}
    monkeypatch.setattr(exec_mod, "cache_get", lambda key: cache.get(key))
    monkeypatch.setattr(
        exec_mod,
        "cache_set",
        lambda key, val: cache.__setitem__(key, copy.deepcopy(val)),
    )

    first = execute_query(
        "pagination_test", SQL, db_type="sqlite", config_json=cfg, use_cache=True
    )
    assert first["cached"] is False

    second = execute_query(
        "pagination_test", SQL, db_type="sqlite", config_json=cfg, use_cache=True
    )
    assert second["cached"] is True

    nocache = execute_query(
        "pagination_test", SQL, db_type="sqlite", config_json=cfg, use_cache=False
    )
    assert nocache["cached"] is False
    assert "pagination_test" not in cache  # use_cache=False must not write cache


def test_stale_serve_when_lease_held(cfg, monkeypatch):
    stale = {"columns": ["n"], "rows": [["1"]], "row_count": 1, "total": 1}
    monkeypatch.setattr(exec_mod, "cache_get", lambda key: None)
    monkeypatch.setattr(exec_mod, "cache_get_stale", lambda key: copy.deepcopy(stale))
    monkeypatch.setattr(exec_mod, "cache_try_lock", lambda key, lease_sec=60: False)

    result = execute_query(
        "pagination_test", SQL, db_type="sqlite", config_json=cfg, use_cache=True
    )
    assert result["cached"] is True
    assert result["rows"] == [["1"]]
    assert result["row_count"] == 1
