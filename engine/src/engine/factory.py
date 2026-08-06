import json
import logging

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)

_db_type_drivers = {
    "postgresql": "postgresql+psycopg2",
    "mysql": "mysql+pymysql",
    "sqlite": "sqlite",
    "clickhouse": "clickhouse+http",
}


def _build_url(db_type: str, config: dict) -> str:
    if db_type == "sqlite":
        path = config.get("path", ":memory:")
        return f"sqlite:///{path}"
    if db_type == "bigquery":
        project = config.get("project", "")
        dataset = config.get("dataset", "")
        credentials = config.get("credentials_path", "")
        params = f"?credentials_path={credentials}" if credentials else ""
        return f"bigquery://{project}/{dataset}{params}"

    driver = _db_type_drivers.get(db_type, f"{db_type}")
    host = config.get("host", "localhost")
    port = config.get("port", "")
    user = config.get("user", "")
    password = config.get("password", "")
    database = config.get("database", "")

    creds = f"{user}:{password}@" if user else ""
    addr = f"{host}:{port}" if port else host
    db = f"/{database}" if database else ""
    params = config.get("params", "")

    return f"{driver}://{creds}{addr}{db}{params}"


class EnginePool:
    def __init__(self):
        self._engines: dict[str, Engine] = {}

    def get(self, source_id: str, db_type: str, config_json: str) -> Engine:
        if source_id in self._engines:
            return self._engines[source_id]

        config = (
            json.loads(config_json) if isinstance(config_json, str) else config_json
        )
        url = _build_url(db_type, config)

        logger.info(f"Creating engine for [{source_id}] {db_type}")

        engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=2,
            max_overflow=2,
            pool_recycle=300,
            connect_args={"connect_timeout": 5} if db_type != "sqlite" else {},
            echo=False,
        )
        self._engines[source_id] = engine
        return engine

    def dispose(self, source_id: str):
        engine = self._engines.pop(source_id, None)
        if engine:
            logger.info(f"Disposing engine for [{source_id}]")
            engine.dispose()

    def test(self, db_type: str, config_json: str) -> tuple[bool, str | None]:
        try:
            config = (
                json.loads(config_json) if isinstance(config_json, str) else config_json
            )
            url = _build_url(db_type, config)
            engine = create_engine(
                url,
                poolclass=QueuePool,
                pool_size=1,
                max_overflow=0,
                connect_args={"connect_timeout": 5} if db_type != "sqlite" else {},
            )
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine.dispose()
            return True, None
        except Exception as e:
            return False, str(e)


engine_pool = EnginePool()
