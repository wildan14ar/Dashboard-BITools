from sqlalchemy import Engine, inspect


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


def get_schema(engine: Engine) -> list[dict]:
    inspector = inspect(engine)
    items = []

    for schema_name in sorted(inspector.get_schema_names()):
        for table_name in sorted(inspector.get_table_names(schema=schema_name)):
            items.append(
                {
                    "name": table_name,
                    "schema": schema_name,
                    "type": "table",
                    "columns": _get_columns(inspector, table_name, schema_name),
                }
            )
        for view_name in sorted(inspector.get_view_names(schema=schema_name)):
            items.append(
                {
                    "name": view_name,
                    "schema": schema_name,
                    "type": "view",
                    "columns": _get_columns(inspector, view_name, schema_name),
                }
            )

    return items
