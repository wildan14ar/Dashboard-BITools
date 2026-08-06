// Original file: proto/engine.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CacheRequest as _query_engine_CacheRequest, CacheRequest__Output as _query_engine_CacheRequest__Output } from '../engine/CacheRequest';
import type { CacheResponse as _query_engine_CacheResponse, CacheResponse__Output as _query_engine_CacheResponse__Output } from '../engine/CacheResponse';
import type { QueryRequest as _query_engine_QueryRequest, QueryRequest__Output as _query_engine_QueryRequest__Output } from '../engine/QueryRequest';
import type { QueryResponse as _query_engine_QueryResponse, QueryResponse__Output as _query_engine_QueryResponse__Output } from '../engine/QueryResponse';
import type { RowBatch as _query_engine_RowBatch, RowBatch__Output as _query_engine_RowBatch__Output } from '../engine/RowBatch';
import type { SchemaRequest as _query_engine_SchemaRequest, SchemaRequest__Output as _query_engine_SchemaRequest__Output } from '../engine/SchemaRequest';
import type { SchemaResponse as _query_engine_SchemaResponse, SchemaResponse__Output as _query_engine_SchemaResponse__Output } from '../engine/SchemaResponse';
import type { TestRequest as _query_engine_TestRequest, TestRequest__Output as _query_engine_TestRequest__Output } from '../engine/TestRequest';
import type { TestResponse as _query_engine_TestResponse, TestResponse__Output as _query_engine_TestResponse__Output } from '../engine/TestResponse';

export interface QueryEngineClient extends grpc.Client {
  Execute(argument: _query_engine_QueryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  Execute(argument: _query_engine_QueryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_query_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  Execute(argument: _query_engine_QueryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  Execute(argument: _query_engine_QueryRequest, callback: grpc.requestCallback<_query_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  execute(argument: _query_engine_QueryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  execute(argument: _query_engine_QueryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_query_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  execute(argument: _query_engine_QueryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  execute(argument: _query_engine_QueryRequest, callback: grpc.requestCallback<_query_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  
  ExecuteStream(argument: _query_engine_QueryRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_query_engine_RowBatch__Output>;
  ExecuteStream(argument: _query_engine_QueryRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_query_engine_RowBatch__Output>;
  executeStream(argument: _query_engine_QueryRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_query_engine_RowBatch__Output>;
  executeStream(argument: _query_engine_QueryRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_query_engine_RowBatch__Output>;
  
  GetSchema(argument: _query_engine_SchemaRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  GetSchema(argument: _query_engine_SchemaRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_query_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  GetSchema(argument: _query_engine_SchemaRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  GetSchema(argument: _query_engine_SchemaRequest, callback: grpc.requestCallback<_query_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  getSchema(argument: _query_engine_SchemaRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  getSchema(argument: _query_engine_SchemaRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_query_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  getSchema(argument: _query_engine_SchemaRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  getSchema(argument: _query_engine_SchemaRequest, callback: grpc.requestCallback<_query_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  
  InvalidateCache(argument: _query_engine_CacheRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  InvalidateCache(argument: _query_engine_CacheRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_query_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  InvalidateCache(argument: _query_engine_CacheRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  InvalidateCache(argument: _query_engine_CacheRequest, callback: grpc.requestCallback<_query_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  invalidateCache(argument: _query_engine_CacheRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  invalidateCache(argument: _query_engine_CacheRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_query_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  invalidateCache(argument: _query_engine_CacheRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  invalidateCache(argument: _query_engine_CacheRequest, callback: grpc.requestCallback<_query_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  
  TestConnection(argument: _query_engine_TestRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  TestConnection(argument: _query_engine_TestRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_query_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  TestConnection(argument: _query_engine_TestRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  TestConnection(argument: _query_engine_TestRequest, callback: grpc.requestCallback<_query_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  testConnection(argument: _query_engine_TestRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  testConnection(argument: _query_engine_TestRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_query_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  testConnection(argument: _query_engine_TestRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_query_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  testConnection(argument: _query_engine_TestRequest, callback: grpc.requestCallback<_query_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface QueryEngineHandlers extends grpc.UntypedServiceImplementation {
  Execute: grpc.handleUnaryCall<_query_engine_QueryRequest__Output, _query_engine_QueryResponse>;
  
  ExecuteStream: grpc.handleServerStreamingCall<_query_engine_QueryRequest__Output, _query_engine_RowBatch>;
  
  GetSchema: grpc.handleUnaryCall<_query_engine_SchemaRequest__Output, _query_engine_SchemaResponse>;
  
  InvalidateCache: grpc.handleUnaryCall<_query_engine_CacheRequest__Output, _query_engine_CacheResponse>;
  
  TestConnection: grpc.handleUnaryCall<_query_engine_TestRequest__Output, _query_engine_TestResponse>;
  
}

export interface QueryEngineDefinition extends grpc.ServiceDefinition {
  Execute: MethodDefinition<_query_engine_QueryRequest, _query_engine_QueryResponse, _query_engine_QueryRequest__Output, _query_engine_QueryResponse__Output>
  ExecuteStream: MethodDefinition<_query_engine_QueryRequest, _query_engine_RowBatch, _query_engine_QueryRequest__Output, _query_engine_RowBatch__Output>
  GetSchema: MethodDefinition<_query_engine_SchemaRequest, _query_engine_SchemaResponse, _query_engine_SchemaRequest__Output, _query_engine_SchemaResponse__Output>
  InvalidateCache: MethodDefinition<_query_engine_CacheRequest, _query_engine_CacheResponse, _query_engine_CacheRequest__Output, _query_engine_CacheResponse__Output>
  TestConnection: MethodDefinition<_query_engine_TestRequest, _query_engine_TestResponse, _query_engine_TestRequest__Output, _query_engine_TestResponse__Output>
}
