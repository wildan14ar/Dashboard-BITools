from sqlalchemy import inspect, Engine


def get_schema(engine: Engine) -> list[dict]:
    inspector = inspect(engine)
    tables = []
    for table_name in sorted(inspector.get_table_names()):
        columns = []
        pks = {
            col["name"]
            for col in inspector.get_pk_constraint(table_name).get(
                "constrained_columns", []
            )
        }
        for col in inspector.get_columns(table_name):
            columns.append(
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                }
            )
        tables.append(
            {
                "name": table_name,
                "schema": inspector.default_schema_name or "",
                "columns": columns,
            }
        )
    return tables
