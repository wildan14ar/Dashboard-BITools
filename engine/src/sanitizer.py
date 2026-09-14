import re

# Statement openers yang diizinkan: query baca saja.
OPENERS = {
    "SELECT",
    "WITH",
    "EXPLAIN",
    "SHOW",
    "DESCRIBE",
    "DESC",
    "ANALYZE",
    "VALUES",
    "TABLE",
}

# Kata kunci tulis/DDL/DCL yang selalu ditolak (whole-word, di luar string/komentar).
BLOCKED = {
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
    "copy",
    "vacuum",
    "reindex",
    "cluster",
    "listen",
    "notify",
    "unlisten",
    "checkpoint",
    "prepare",
    "deallocate",
    "do",
}

# String literal ('...', "..."), line comment (--...), block comment (/*...*/).
_LITERAL_RE = re.compile(
    r"'(?:[^'\\]|\\.|'')*'|\"(?:[^\"\\]|\\.)*\"|--[^\n]*|/\*.*?\*/",
    re.DOTALL,
)

_PARAM_RE = re.compile(r"\{\{(\w+)\}\}")


def _strip_literals(sql: str) -> str:
    """Ganti string literal & komentar dengan spasi agar keyword check tidak tertipu."""
    return _LITERAL_RE.sub(" ", sql)


def is_safe(sql: str) -> bool:
    """True hanya untuk SATU statement baca: opener diizinkan + tanpa token terlarang."""
    if not sql or not sql.strip():
        return False
    code = _strip_literals(sql)
    stmts = [s.strip() for s in code.split(";") if s.strip()]
    if len(stmts) != 1:
        return False
    first = re.match(r"\(\s*([A-Za-z]+)|([A-Za-z]+)", stmts[0])
    if not first:
        return False
    opener = (first.group(1) or first.group(2)).upper()
    if opener not in OPENERS:
        return False
    tokens = {t.lower() for t in re.findall(r"\b[A-Za-z_][\w$]*\b", code)}
    return not tokens & BLOCKED


def bind_params(sql: str, params: dict[str, str] | None) -> tuple[str, dict[str, str]]:
    """Ubah placeholder {{name}} menjadi bound param :name (SQLAlchemy text()).

    Nilai TIDAK diinterpolasi ke string SQL — driver yang meng-escape,
    sehingga kebal SQL injection. Missing param = ValueError eksplisit.
    """
    params = params or {}
    names = _PARAM_RE.findall(sql)
    missing = sorted({n for n in names if n not in params})
    if missing:
        raise ValueError(f"Missing query parameters: {', '.join(missing)}")
    bound = {n: params[n] for n in dict.fromkeys(names)}
    rewritten = _PARAM_RE.sub(lambda m: f":{m.group(1)}", sql)
    return rewritten, bound
