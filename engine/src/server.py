import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "generated"))

import logging
from concurrent import futures

import engine_pb2 as pb
import engine_pb2_grpc as rpc
import grpc

from src.config import GRPC_PORT
from src.executor import (
    execute_query,
    get_schema_info,
    invalidate_cache,
    test_connection,
)

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
                db_type=request.db_type,
                config_json=request.config_json,
                max_rows=request.max_rows,
                timeout_sec=request.timeout_sec,
                params=dict(request.params),
                use_cache=request.use_cache,
                limit=request.limit,
                offset=request.offset,
            )
            rows = [pb.Row(values=r) for r in result["rows"]]
            return pb.QueryResponse(
                columns=result["columns"],
                rows=rows,
                row_count=result["row_count"],
                execution_time_ms=result["execution_time_ms"],
                cached=result.get("cached", False),
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
                db_type=request.db_type,
                config_json=request.config_json,
                max_rows=request.max_rows or 10000,
                timeout_sec=request.timeout_sec or 60,
                params=dict(request.params),
                use_cache=request.use_cache,
                limit=request.limit,
                offset=request.offset,
            )
            batch_size = 500
            rows = result["rows"]
            for i in range(0, len(rows), batch_size):
                batch = rows[i : i + batch_size]
                pb_rows = [pb.Row(values=r) for r in batch]
                yield pb.RowBatch(
                    columns=result["columns"],
                    rows=pb_rows,
                    is_last=(i + batch_size >= len(rows)),
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
            logger.info(
                f"GetSchema: source_id={request.source_id}, db_type={request.db_type}, config_json={request.config_json[:50]}..."
            )
            result = get_schema_info(
                request.source_id, request.db_type, request.config_json
            )
            tables = [
                pb.TableInfo(
                    name=t["name"],
                    schema=t.get("schema", ""),
                    columns=[
                        pb.ColumnInfo(
                            name=c["name"],
                            type=c["type"],
                            nullable=c.get("nullable", True),
                            is_primary_key=c.get("isPrimaryKey", False),
                            foreign_key=(
                                pb.ForeignKey(
                                    table=c["foreignKey"]["table"],
                                    column=c["foreignKey"]["column"],
                                )
                                if c.get("foreignKey")
                                else None
                            ),
                        )
                        for c in t["columns"]
                    ],
                )
                for t in result["tables"]
            ]
            return pb.SchemaResponse(tables=tables)
        except Exception as e:
            logger.exception("GetSchema failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return pb.SchemaResponse()

    def InvalidateCache(self, request: pb.CacheRequest, context):
        try:
            return pb.CacheResponse(
                ok=invalidate_cache(request.source_id).get("ok", False)
            )
        except Exception as e:
            logger.exception("InvalidateCache failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return pb.CacheResponse(ok=False)


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    rpc.add_QueryEngineServicer_to_server(QueryEngineServicer(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    logger.info(f"QueryEngine gRPC server running on port {GRPC_PORT}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
