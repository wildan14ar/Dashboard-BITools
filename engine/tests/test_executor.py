import copy
import json

import pytest
from sqlalchemy import text

from src.engine import executor as exec_mod
from src.engine.executor import execute_query
from src.engine.factory import engine_pool

SQL = "SELECT * FROM nums ORDER BY n"


@pytest.fixture
def cfg(tmp_path):
    config_json = json.dumps({"path": str(tmp_path / "test.db")})
    engine = engine_pool.get("pagination_test", "sqlite", config_json)
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS nums"))
        conn.execute(text("CREATE TABLE nums (n INTEGER)"))
        conn.execute(
            text("INSERT INTO nums VALUES (:n)"), [{"n": i} for i in range(50)]
        )
        conn.commit()
    yield config_json
    engine_pool.dispose("pagination_test")


def test_pagination(cfg):
    p1 = execute_query(
        "pagination_test",
        SQL,
        db_type="sqlite",
        config_json=cfg,
        limit=10,
        offset=0,
        use_cache=False,
    )
    p2 = execute_query(
        "pagination_test",
        SQL,
        db_type="sqlite",
        config_json=cfg,
        limit=10,
        offset=10,
        use_cache=False,
    )
    all_rows = execute_query(
        "pagination_test", SQL, db_type="sqlite", config_json=cfg, use_cache=False
    )

    assert [r[0] for r in p1["rows"]] == [str(i) for i in range(10)]
    assert [r[0] for r in p2["rows"]] == [str(i) for i in range(10, 20)]
    assert len(all_rows["rows"]) == 50
    assert all_rows["row_count"] == 50


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
