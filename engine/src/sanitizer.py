import re

ALLOWED_KEYWORDS = {"SELECT", "WITH", "EXPLAIN", "SHOW", "DESCRIBE", "DESC", "ANALYZE"}


def is_safe(sql: str) -> bool:
    pattern = r"\b(" + "|".join(ALLOWED_KEYWORDS) + r")\b"
    stmts = re.findall(pattern, sql, flags=re.IGNORECASE)
    if not stmts:
        return False
    lower_sql = sql.lower()
    for kw in ALLOWED_KEYWORDS:
        if kw.lower() not in lower_sql:
            return False
    # Check for blocked keywords
    blocked = {
        "drop",
        "delete",
        "insert",
        "update",
        "alter",
        "create",
        "truncate",
        "grant",
        "revoke",
        "exec",
        "execute",
        "call",
        "set",
        "rename",
        "replace",
        "commit",
        "rollback",
        "begin",
        "savepoint",
        "lock",
        "unlock",
    }
    for token in re.findall(r"\b\w+\b", lower_sql):
        if token in blocked:
            return False
    return True


def apply_params(sql: str, params: dict[str, str]) -> str:
    def repl(match: re.Match) -> str:
        key = match.group(1)
        val = (params or {}).get(key)
        if val is None:
            return match.group(0)
        return val.replace("'", "''").replace("\\", "\\\\")

    return re.sub(r"\{\{(\w+)\}\}", repl, sql)
