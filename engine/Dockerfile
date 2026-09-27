FROM python:3.14-slim

# uv untuk resolve & install dari uv.lock (deterministik, tanpa kompilasi yang tak perlu).
COPY --from=ghcr.io/astral-sh/uv:0.9.7 /uv /usr/local/bin/uv

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    # Jangan sentuh venv sistem; semua dependency di /app/.venv
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    # Folder upload yang di-share dengan container app (lihat docker-compose.yml).
    DATA_DIR=/data

WORKDIR /app

# Layer 1: dependency. Cache tetap dipakai selama pyproject/uv.lock tidak berubah.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Layer 2: generated protobuf stubs. SUDAH ter-commit di repo, jadi tidak perlu
# menjalankan grpc_tools.protoc saat runtime — stub itu yang di-import
# `src/server.py` lewat sys.path yang diarahkan ke folder ini.
#
# Catatan: `proto/engine.proto` berada di root repo (bukan di engine/), sehingga
# build WAJIB memakai context = ./engine. Kalau butuh regenerate stub:
#   uv run --group dev python -m grpc_tools.protoc -I../proto \
#     --python_out=generated --grpc_python_out=generated ../proto/engine.proto
COPY generated/ generated/

COPY src/ src/

# Non-root. python:3.14-slim menyediakan useradd, jadi bisa buat user sendiri.
# UID/GID 10001 dicocokkan dengan user app di docker-compose (shared volume /data).
RUN groupadd --gid 10001 engine \
 && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin engine \
 && mkdir -p /data \
 && chown -R 10001:10001 /app /data

USER 10001:10001

EXPOSE 50051

# gRPC tidak ada endpoint HTTP, jadi healthcheck = cek port 50051 bisa di-connect.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["/app/.venv/bin/python", "-c", "import socket; s=socket.create_connection(('127.0.0.1',50051),3); s.close()"]

# Panggil python dari venv secara langsung (bukan `python` sistem, dan bukan
# `uv run`): `uv run` mencoba re-sync + mengunduh dev group tiap start, yang
# akan gagal di image tanpa jaringan.
CMD ["/app/.venv/bin/python", "-m", "src.server"]
