import re

import sqlparse

ALLOWED_KEYWORDS = {"SELECT", "WITH", "EXPLAIN", "SHOW", "DESCRIBE", "DESC", "ANALYZE"}
BLOCKED_KEYWORDS = {
    "DROP",
    "DELETE",
    "INSERT",
    "UPDATE",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "EXEC",
    "EXECUTE",
    "CALL",
    "SET",
    "RENAME",
    "REPLACE",
    "COMMIT",
    "ROLLBACK",
    "BEGIN",
    "SAVEPOINT",
    "LOCK",
    "UNLOCK",
}

TEMPLATE_RE = re.compile(r"\{\{(\w+)\}\}")


def is_safe(sql: str) -> bool:
    stmts = sqlparse.parse(sql)
    for stmt in stmts:
        if stmt.get_type() not in ALLOWED_KEYWORDS:
            return False
        for token in stmt.flatten():
            if (
                token.ttype is sqlparse.tokens.Keyword
                and token.value.upper() in BLOCKED_KEYWORDS
            ):
                return False
    return True


def apply_params(sql: str, params: dict[str, str]) -> str:
    def repl(match: re.Match) -> str:
        key = match.group(1)
        val = (params or {}).get(key)
        if val is None:
            return match.group(0)
        return val.replace("'", "''").replace("\\", "\\\\")

    return TEMPLATE_RE.sub(repl, sql)
