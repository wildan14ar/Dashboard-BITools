import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { CacheRequest as _engine_CacheRequest, CacheRequest__Output as _engine_CacheRequest__Output } from './engine/CacheRequest';
import type { CacheResponse as _engine_CacheResponse, CacheResponse__Output as _engine_CacheResponse__Output } from './engine/CacheResponse';
import type { ColumnInfo as _engine_ColumnInfo, ColumnInfo__Output as _engine_ColumnInfo__Output } from './engine/ColumnInfo';
import type { ForeignKey as _engine_ForeignKey, ForeignKey__Output as _engine_ForeignKey__Output } from './engine/ForeignKey';
import type { QueryEngineClient as _engine_QueryEngineClient, QueryEngineDefinition as _engine_QueryEngineDefinition } from './engine/QueryEngine';
import type { QueryRequest as _engine_QueryRequest, QueryRequest__Output as _engine_QueryRequest__Output } from './engine/QueryRequest';
import type { QueryResponse as _engine_QueryResponse, QueryResponse__Output as _engine_QueryResponse__Output } from './engine/QueryResponse';
import type { Row as _engine_Row, Row__Output as _engine_Row__Output } from './engine/Row';
import type { RowBatch as _engine_RowBatch, RowBatch__Output as _engine_RowBatch__Output } from './engine/RowBatch';
import type { SchemaRequest as _engine_SchemaRequest, SchemaRequest__Output as _engine_SchemaRequest__Output } from './engine/SchemaRequest';
import type { SchemaResponse as _engine_SchemaResponse, SchemaResponse__Output as _engine_SchemaResponse__Output } from './engine/SchemaResponse';
import type { TableInfo as _engine_TableInfo, TableInfo__Output as _engine_TableInfo__Output } from './engine/TableInfo';
import type { TestRequest as _engine_TestRequest, TestRequest__Output as _engine_TestRequest__Output } from './engine/TestRequest';
import type { TestResponse as _engine_TestResponse, TestResponse__Output as _engine_TestResponse__Output } from './engine/TestResponse';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  engine: {
    CacheRequest: MessageTypeDefinition<_engine_CacheRequest, _engine_CacheRequest__Output>
    CacheResponse: MessageTypeDefinition<_engine_CacheResponse, _engine_CacheResponse__Output>
    ColumnInfo: MessageTypeDefinition<_engine_ColumnInfo, _engine_ColumnInfo__Output>
    ForeignKey: MessageTypeDefinition<_engine_ForeignKey, _engine_ForeignKey__Output>
    QueryEngine: SubtypeConstructor<typeof grpc.Client, _engine_QueryEngineClient> & { service: _engine_QueryEngineDefinition }
    QueryRequest: MessageTypeDefinition<_engine_QueryRequest, _engine_QueryRequest__Output>
    QueryResponse: MessageTypeDefinition<_engine_QueryResponse, _engine_QueryResponse__Output>
    Row: MessageTypeDefinition<_engine_Row, _engine_Row__Output>
    RowBatch: MessageTypeDefinition<_engine_RowBatch, _engine_RowBatch__Output>
    SchemaRequest: MessageTypeDefinition<_engine_SchemaRequest, _engine_SchemaRequest__Output>
    SchemaResponse: MessageTypeDefinition<_engine_SchemaResponse, _engine_SchemaResponse__Output>
    TableInfo: MessageTypeDefinition<_engine_TableInfo, _engine_TableInfo__Output>
    TestRequest: MessageTypeDefinition<_engine_TestRequest, _engine_TestRequest__Output>
    TestResponse: MessageTypeDefinition<_engine_TestResponse, _engine_TestResponse__Output>
  }
}

