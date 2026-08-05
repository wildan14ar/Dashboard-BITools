import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { CacheRequest as _query_engine_CacheRequest, CacheRequest__Output as _query_engine_CacheRequest__Output } from './query_engine/CacheRequest';
import type { CacheResponse as _query_engine_CacheResponse, CacheResponse__Output as _query_engine_CacheResponse__Output } from './query_engine/CacheResponse';
import type { ColumnInfo as _query_engine_ColumnInfo, ColumnInfo__Output as _query_engine_ColumnInfo__Output } from './query_engine/ColumnInfo';
import type { QueryEngineClient as _query_engine_QueryEngineClient, QueryEngineDefinition as _query_engine_QueryEngineDefinition } from './query_engine/QueryEngine';
import type { QueryRequest as _query_engine_QueryRequest, QueryRequest__Output as _query_engine_QueryRequest__Output } from './query_engine/QueryRequest';
import type { QueryResponse as _query_engine_QueryResponse, QueryResponse__Output as _query_engine_QueryResponse__Output } from './query_engine/QueryResponse';
import type { Row as _query_engine_Row, Row__Output as _query_engine_Row__Output } from './query_engine/Row';
import type { RowBatch as _query_engine_RowBatch, RowBatch__Output as _query_engine_RowBatch__Output } from './query_engine/RowBatch';
import type { SchemaRequest as _query_engine_SchemaRequest, SchemaRequest__Output as _query_engine_SchemaRequest__Output } from './query_engine/SchemaRequest';
import type { SchemaResponse as _query_engine_SchemaResponse, SchemaResponse__Output as _query_engine_SchemaResponse__Output } from './query_engine/SchemaResponse';
import type { TableInfo as _query_engine_TableInfo, TableInfo__Output as _query_engine_TableInfo__Output } from './query_engine/TableInfo';
import type { TestRequest as _query_engine_TestRequest, TestRequest__Output as _query_engine_TestRequest__Output } from './query_engine/TestRequest';
import type { TestResponse as _query_engine_TestResponse, TestResponse__Output as _query_engine_TestResponse__Output } from './query_engine/TestResponse';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  query_engine: {
    CacheRequest: MessageTypeDefinition<_query_engine_CacheRequest, _query_engine_CacheRequest__Output>
    CacheResponse: MessageTypeDefinition<_query_engine_CacheResponse, _query_engine_CacheResponse__Output>
    ColumnInfo: MessageTypeDefinition<_query_engine_ColumnInfo, _query_engine_ColumnInfo__Output>
    QueryEngine: SubtypeConstructor<typeof grpc.Client, _query_engine_QueryEngineClient> & { service: _query_engine_QueryEngineDefinition }
    QueryRequest: MessageTypeDefinition<_query_engine_QueryRequest, _query_engine_QueryRequest__Output>
    QueryResponse: MessageTypeDefinition<_query_engine_QueryResponse, _query_engine_QueryResponse__Output>
    Row: MessageTypeDefinition<_query_engine_Row, _query_engine_Row__Output>
    RowBatch: MessageTypeDefinition<_query_engine_RowBatch, _query_engine_RowBatch__Output>
    SchemaRequest: MessageTypeDefinition<_query_engine_SchemaRequest, _query_engine_SchemaRequest__Output>
    SchemaResponse: MessageTypeDefinition<_query_engine_SchemaResponse, _query_engine_SchemaResponse__Output>
    TableInfo: MessageTypeDefinition<_query_engine_TableInfo, _query_engine_TableInfo__Output>
    TestRequest: MessageTypeDefinition<_query_engine_TestRequest, _query_engine_TestRequest__Output>
    TestResponse: MessageTypeDefinition<_query_engine_TestResponse, _query_engine_TestResponse__Output>
  }
}

