import pytest

from src.sanitizer import bind_params, is_safe


def test_select_plain_is_safe():
    assert is_safe("SELECT 1") is True
    assert is_safe("select n, count(*) from nums where n > 10 order by n desc") is True


def test_cte_is_safe():
    assert is_safe("WITH a AS (SELECT 1) SELECT * FROM a") is True


def test_explain_show_describe_safe():
    assert is_safe("EXPLAIN SELECT * FROM nums") is True
    assert is_safe("SHOW TABLES") is True
    assert is_safe("DESCRIBE nums") is True


def test_write_statements_blocked():
    for sql in [
        "DROP TABLE nums",
        "DELETE FROM nums",
        "INSERT INTO nums VALUES (1)",
        "UPDATE nums SET n = 1",
        "ALTER TABLE nums ADD COLUMN x INT",
        "CREATE TABLE x (n INT)",
        "TRUNCATE nums",
        "GRANT SELECT ON nums TO bob",
    ]:
        assert is_safe(sql) is False, sql


def test_stacked_statement_blocked():
    assert is_safe("SELECT * FROM nums; DROP TABLE nums") is False
    assert is_safe("SELECT 1; SELECT 2") is False


def test_keywords_in_strings_or_comments_ignored():
    assert is_safe("SELECT 'drop table users' AS note") is True
    assert is_safe("SELECT n FROM nums -- delete this later\n WHERE n > 1") is True
    assert is_safe("/* truncate test */ SELECT 1") is True


def test_empty_or_garbage_rejected():
    assert is_safe("") is False
    assert is_safe("   ") is False
    assert is_safe("hi there") is False


def test_bind_params_rewrites_to_named():
    sql, bound = bind_params(
        "SELECT * FROM t WHERE a = {{x}} AND b = {{y}}", {"x": "1", "y": "2"}
    )
    assert sql == "SELECT * FROM t WHERE a = :x AND b = :y"
    assert bound == {"x": "1", "y": "2"}


def test_bind_params_missing_raises():
    with pytest.raises(ValueError, match="Missing query parameters: y"):
        bind_params("SELECT {{x}}, {{y}}", {"x": "1"})


def test_bind_params_no_placeholders():
    sql, bound = bind_params("SELECT 1", {})
    assert sql == "SELECT 1"
    assert bound == {}
