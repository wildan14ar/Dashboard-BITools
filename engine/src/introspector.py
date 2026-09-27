from sqlalchemy import Engine, inspect

from src.config import INTROSPECT_MAX_OBJECTS, INTROSPECT_SCHEMAS, SYSTEM_SCHEMAS


def _get_columns(inspector, table_name: str, schema_name: str) -> list[dict]:
    pks = set(
        inspector.get_pk_constraint(table_name, schema=schema_name).get(
            "constrained_columns", []
        )
    )
    fks = inspector.get_foreign_keys(table_name, schema=schema_name)
    fk_map: dict[str, dict] = {}
    for fk in fks:
        for i, col in enumerate(fk.get("constrained_columns", [])):
            fk_map[col] = {
                "table": fk.get("referred_table", ""),
                "column": (
                    fk["referred_columns"][i]
                    if i < len(fk.get("referred_columns", []))
                    else ""
                ),
            }

    columns = []
    for col in inspector.get_columns(table_name, schema=schema_name):
        c = {
            "name": col["name"],
            "type": str(col["type"]),
            "nullable": col.get("nullable", True),
            "isPrimaryKey": col["name"] in pks,
        }
        if col["name"] in fk_map:
            c["foreignKey"] = fk_map[col["name"]]
        columns.append(c)
    return columns


def _target_schemas(inspector) -> list[str]:
    """Schema yang perlu diintrospeksi.

    Introspeksi di SQLAlchemy}~3 query per objek, dan kueri katalog pada
    schema sistem (information_schema) jauh lebih lambat karena view-nya
    sendiri dihitung per-panggilan. Karena itu schema sistem selalu
    dilewati, dan daftar schema yang dipindai bisa dipersempit lewat env
    INTROSPECT_SCHEMAS (kosong = semua schema non-sistem).
    """
    available = [
        s for s in sorted(inspector.get_schema_names()) if s not in SYSTEM_SCHEMAS
    ]
    if not INTROSPECT_SCHEMAS:
        return available
    wanted = [s.strip() for s in INTROSPECT_SCHEMAS.split(",") if s.strip()]
    return [s for s in available if s in wanted]


def get_schema(engine: Engine) -> list[dict]:
    inspector = inspect(engine)
    items: list[dict] = []
    truncated = False

    for schema_name in _target_schemas(inspector):
        objects: list[tuple[str, str]] = [
            (name, "table")
            for name in sorted(inspector.get_table_names(schema=schema_name))
        ] + [
            (name, "view")
            for name in sorted(inspector.get_view_names(schema=schema_name))
        ]

        for name, kind in objects:
            if len(items) >= INTROSPECT_MAX_OBJECTS:
                truncated = True
                break
            items.append(
                {
                    "name": name,
                    "schema": schema_name,
                    "type": kind,
                    "columns": _get_columns(inspector, name, schema_name),
                }
            )
        if truncated:
            break

    if truncated:
        items.append(
            {
                "name": f"...dipotong pada batas {INTROSPECT_MAX_OBJECTS} objek",
                "schema": "",
                "type": "notice",
                "columns": [],
            }
        )

    return items
