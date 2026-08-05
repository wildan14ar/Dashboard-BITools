import os
from dotenv import load_dotenv

load_dotenv()

GRPC_PORT = int(os.getenv("QUERY_ENGINE_PORT", "50051"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MAX_ROWS_DEFAULT = 1000
MAX_ROWS_HARD = 50_000
TIMEOUT_SEC_DEFAULT = 30
TIMEOUT_SEC_HARD = 300
