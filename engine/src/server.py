import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "generated"))

import json
import logging
from concurrent import futures
import grpc

import query_engine_pb2 as pb
import query_engine_pb2_grpc as rpc
from src.engine.executor import execute_query, test_connection, get_schema_info
from src.engine.sanitizer import is_safe
from src.config import GRPC_PORT

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


class QueryEngineServicer(rpc.QueryEngineServicer):
    def Execute(self, request: pb.QueryRequest, context):
        try:
            result = execute_query(
                source_id=request.source_id,
                sql=request.sql,
                max_rows=request.max_rows,
                timeout_sec=request.timeout_sec,
                params=dict(request.params),
            )
            rows = [pb.Row(values=r) for r in result["rows"]]
            return pb.QueryResponse(
                columns=result["columns"],
                rows=rows,
                rowCount=result["row_count"],
                executionTimeMs=result["execution_time_ms"],
                cached=False,
            )
        except PermissionError as e:
            context.set_code(grpc.StatusCode.PERMISSION_DENIED)
            context.set_details(str(e))
            return pb.QueryResponse()
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            logger.exception("Execute failed")
            return pb.QueryResponse()

    def ExecuteStream(self, request: pb.QueryRequest, context):
        try:
            result = execute_query(
                source_id=request.source_id,
                sql=request.sql,
                max_rows=request.max_rows or 10000,
                timeout_sec=request.timeout_sec or 60,
                params=dict(request.params),
            )
            batch_size = 500
            rows = result["rows"]
            for i in range(0, len(rows), batch_size):
                batch = rows[i : i + batch_size]
                pb_rows = [pb.Row(values=r) for r in batch]
                yield pb.RowBatch(
                    columns=result["columns"],
                    rows=pb_rows,
                    isLast=(i + batch_size >= len(rows)),
                )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            logger.exception("ExecuteStream failed")

    def TestConnection(self, request: pb.TestRequest, context):
        result = test_connection(request.db_type, request.config_json)
        return pb.TestResponse(ok=result["ok"], error=result["error"])

    def GetSchema(self, request: pb.SchemaRequest, context):
        try:
            result = get_schema_info(request.source_id, "postgresql", "{}")
            tables = [
                pb.TableInfo(
                    name=t["name"],
                    schema=t.get("schema", ""),
                    columns=[
                        pb.ColumnInfo(
                            name=c["name"], type=c["type"], nullable=c["nullable"]
                        )
                        for c in t["columns"]
                    ],
                )
                for t in result["tables"]
            ]
            return pb.SchemaResponse(tables=tables)
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return pb.SchemaResponse()

    def InvalidateCache(self, request: pb.CacheRequest, context):
        return pb.CacheResponse(ok=True)


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    rpc.add_QueryEngineServicer_to_server(QueryEngineServicer(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    logger.info(f"QueryEngine gRPC server running on port {GRPC_PORT}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
