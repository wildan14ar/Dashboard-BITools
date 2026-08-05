FROM python:3.14-slim

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

COPY proto/ proto/
COPY generated/ generated/
COPY src/ src/

RUN uv run python -m grpc_tools.protoc -Iproto --python_out=generated --grpc_python_out=generated proto/query_engine.proto

EXPOSE 50051

CMD ["uv", "run", "python", "-m", "src.server"]
