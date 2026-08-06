FROM python:3.14-slim

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

COPY src/ src/

EXPOSE 50051

CMD mkdir -p generated && uv run python -m grpc_tools.protoc -Iproto --python_out=generated --grpc_python_out=generated proto/engine.proto && uv run python -m src.server
