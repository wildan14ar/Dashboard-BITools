import contextlib
import json
from unittest import mock

import pytest

from src.conn import _REGISTRY
from src.conn import create as conn_create


def test_registry_has_all_supported_types():
    for db_type in (
        "postgresql",
        "mysql",
        "mariadb",
        "mssql",
        "clickhouse",
        "bigquery",
        "mongodb",
        "api",
        "sqlite",
    ):
        assert db_type in _REGISTRY, db_type


def test_unknown_type_still_rejected():
    with pytest.raises(ValueError, match="Unknown db_type"):
        conn_create("oracle", "x", "{}")


def test_mysql_url_and_defaults():
    eng = conn_create(
        "mysql",
        "u1",
        json.dumps({"host": "db", "user": "u", "password": "p", "database": "d"}),
    )
    assert str(eng._engine.url).startswith("mysql+pymysql://")
    assert "3306" in str(eng._engine.url)
    eng.close()


def test_mariadb_shares_mysql_connector():
    eng = conn_create("mariadb", "u1", json.dumps({"host": "db", "database": "d"}))
    assert str(eng._engine.url).startswith("mysql+pymysql://")
    eng.close()


def test_mssql_url():
    eng = conn_create(
        "mssql",
        "u1",
        json.dumps({"host": "db", "user": "u", "password": "p", "database": "d"}),
    )
    assert str(eng._engine.url).startswith("mssql+pymssql://")
    assert "1433" in str(eng._engine.url)
    eng.close()


def test_clickhouse_url():
    eng = conn_create(
        "clickhouse", "u1", json.dumps({"host": "ch", "user": "u", "password": "p"})
    )
    assert str(eng._engine.url).startswith("clickhouse+native://")
    eng.close()


def _make_bigquery(source_id, cfg):
    """Konstruksi tanpa kredensial asli: mock create_engine, intip URL yang dibangun."""
    with mock.patch("src.conn.bigquery.create_engine") as create_engine:
        create_engine.return_value = mock.MagicMock()
        eng = conn_create("bigquery", source_id, json.dumps(cfg))
    return eng, create_engine.call_args[0][0]


def test_bigquery_url_and_cost_guard():
    eng, url = _make_bigquery(
        "u1", {"project": "p", "dataset": "d", "credentials_path": "/k.json"}
    )
    assert "p" in url and "d" in url and "credentials_path" in url
    assert eng._max_bytes == 1_000_000_000
    eng2, _ = _make_bigquery(
        "u2", {"project": "p", "dataset": "d", "maximum_bytes_billed": 10}
    )
    assert eng2._max_bytes == 10
    eng.close()
    eng2.close()


def test_new_connectors_refuse_write_execute():
    for db_type, cfg in (
        ("mysql", {"host": "db", "database": "d"}),
        ("mssql", {"host": "db", "database": "d"}),
        ("clickhouse", {"host": "ch"}),
    ):
        eng = conn_create(db_type, "w", json.dumps(cfg))
        with pytest.raises(PermissionError, match="read-only"):
            eng.execute("SELECT 1", {})
        eng.close()
    eng, _ = _make_bigquery("w", {"project": "p", "dataset": "d"})
    with pytest.raises(PermissionError, match="read-only"):
        eng.execute("SELECT 1", {})
    eng.close()


class _FakeRow:
    def __init__(self, mapping):
        self._mapping = mapping


class _FakeResult:
    def fetchall(self):
        return [_FakeRow({"n": 1})]


class _FakeConn:
    def __init__(self, log):
        self._log = log

    def execute(self, stmt, params=None):
        self._log.append(str(stmt))
        return _FakeResult()

    def rollback(self):
        self._log.append("ROLLBACK")


def _patch_engine(eng, log):
    @contextlib.contextmanager
    def fake_connect():
        yield _FakeConn(log)

    eng._engine = type(
        "FakeEngine",
        (),
        {"connect": lambda self: fake_connect(), "dispose": lambda self: None},
    )()


def test_mysql_issues_readonly_guard_first():
    eng = conn_create("mysql", "ro", json.dumps({"host": "db", "database": "d"}))
    log: list = []
    _patch_engine(eng, log)
    rows = eng.fetch_all("SELECT * FROM t", {})
    assert rows == [{"n": 1}]
    assert log[0] == "SET TRANSACTION READ ONLY"
    assert any("SELECT * FROM t" in s for s in log[1:])
    assert log[-1] == "ROLLBACK"
    eng.close()


def test_clickhouse_issues_readonly_guard_first():
    eng = conn_create("clickhouse", "ro", json.dumps({"host": "ch"}))
    log: list = []
    _patch_engine(eng, log)
    eng.fetch_all("SELECT * FROM t", {})
    assert log[0] == "SET readonly = 1"
    assert log[-1] == "ROLLBACK"
    eng.close()
