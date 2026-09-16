import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

GRPC_PORT = int(os.getenv("QUERY_ENGINE_PORT", "50051"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MAX_ROWS_DEFAULT = 1000
MAX_ROWS_HARD = 50_000
TIMEOUT_SEC_DEFAULT = 30
TIMEOUT_SEC_HARD = 300

# Connection pool tuning
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))

# File/tabular sources (engine/src/conn/file.py)
# Direktori data bersama dashboard (upload) — di compose: /data via volume.
# Default lokal: ./data di repo root (sejajar dengan dashboard).
DATA_DIR = os.getenv("DATA_DIR", str(Path(__file__).resolve().parent.parent.parent / "data"))
# Batas fetch URL/Sheets per query (bytes). Parse berhenti lebih awal
# begitu limit baris tercapai (early-stop), jadi ini hanya pagu darurat.
FETCH_MAX_BYTES = int(os.getenv("FETCH_MAX_BYTES", str(500 * 1024 * 1024)))
# Payload hasil di atas ini tidak di-cache di Redis (schema tetap di-cache).
QUERY_CACHE_MAX_BYTES = int(os.getenv("QUERY_CACHE_MAX_BYTES", str(5 * 1024 * 1024)))
# Baris sampel untuk inferensi tipe kolom file di list_tables().
FILE_SCHEMA_SAMPLE_ROWS = int(os.getenv("FILE_SCHEMA_SAMPLE_ROWS", "100"))
# Ukuran chunk baca stream file/HTTP (bytes).
FILE_READ_CHUNK_SIZE = int(os.getenv("FILE_READ_CHUNK_SIZE", str(1024 * 1024)))
# Paging Sheets API v4 (baris per request).
SHEETS_PAGE_ROWS = int(os.getenv("SHEETS_PAGE_ROWS", "10000"))
