from __future__ import annotations

import logging
from urllib.parse import quote_plus

from sqlalchemy import Engine, create_engine, text

from src.conn import Engine as BaseEngine
from src.conn import register

logger = logging.getLogger(__name__)

DEFAULT_MAX_BYTES_BILLED = 1_000_000_000  # 1 GB per query, pengaman biaya


@register("bigquery")
class BigqueryEngine(BaseEngine):
    """Konektor BigQuery via sqlalchemy-bigquery.

    BigQuery query-job hanya membaca; DML/DDL tetap dicegah sanitizer.
    Pengaman biaya: maximum_bytes_billed (default 1 GB, bisa dioverride di config).
    Di sisi GCP, pakai Service Account berhak minimal (roles/bigquery.jobUser
    + bigquery.dataViewer) — JANGAN pakai akun admin/owner.
    """

    def __init__(self, source_id: str, config: dict) -> None:
        self._source_id = source_id
        project = config.get("project", "")
        dataset = config.get("dataset", "")
        credentials_path = config.get("credentials_path", "")
        location = config.get("location", "")

        url = f"bigquery://{quote_plus(str(project))}/{quote_plus(str(dataset))}/"
        query: list[str] = []
        if credentials_path:
            query.append(f"credentials_path={quote_plus(str(credentials_path))}")
        if location:
            query.append(f"location={quote_plus(str(location))}")
        if query:
            url += "?" + "&".join(query)

        self._max_bytes = int(
            config.get("maximum_bytes_billed", DEFAULT_MAX_BYTES_BILLED)
        )
        self._engine: Engine = create_engine(url, echo=False)
        logger.info(f"Created bigquery engine for [{source_id}] {project}.{dataset}")

    def fetch_all(
        self, sql: str, params: dict | None = None, timeout_sec: int | None = None
    ) -> list[dict]:
        from google.cloud.bigquery import QueryJobConfig

        job_kwargs: dict = {"maximum_bytes_billed": self._max_bytes}
        if timeout_sec:
            job_kwargs["timeoutMs"] = int(timeout_sec) * 1000
        job_config = QueryJobConfig(**job_kwargs)
        with self._engine.connect() as conn:
            try:
                result = conn.execute(
                    text(sql),
                    params or {},
                    execution_options={"job_config": job_config},
                )
                return [dict(r._mapping) for r in result.fetchall()]
            finally:
                conn.rollback()

    @property
    def sa_engine(self):
        return self._engine

    def close(self) -> None:
        self._engine.dispose()
        logger.info(f"Disposed bigquery engine [{self._source_id}]")

    def ping(self) -> bool:
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
