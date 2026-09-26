// Original file: proto/engine.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CacheRequest as _engine_CacheRequest, CacheRequest__Output as _engine_CacheRequest__Output } from '../engine/CacheRequest';
import type { CacheResponse as _engine_CacheResponse, CacheResponse__Output as _engine_CacheResponse__Output } from '../engine/CacheResponse';
import type { QueryRequest as _engine_QueryRequest, QueryRequest__Output as _engine_QueryRequest__Output } from '../engine/QueryRequest';
import type { QueryResponse as _engine_QueryResponse, QueryResponse__Output as _engine_QueryResponse__Output } from '../engine/QueryResponse';
import type { RowBatch as _engine_RowBatch, RowBatch__Output as _engine_RowBatch__Output } from '../engine/RowBatch';
import type { SchemaRequest as _engine_SchemaRequest, SchemaRequest__Output as _engine_SchemaRequest__Output } from '../engine/SchemaRequest';
import type { SchemaResponse as _engine_SchemaResponse, SchemaResponse__Output as _engine_SchemaResponse__Output } from '../engine/SchemaResponse';
import type { TestRequest as _engine_TestRequest, TestRequest__Output as _engine_TestRequest__Output } from '../engine/TestRequest';
import type { TestResponse as _engine_TestResponse, TestResponse__Output as _engine_TestResponse__Output } from '../engine/TestResponse';

export interface QueryEngineClient extends grpc.Client {
  Execute(argument: _engine_QueryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  Execute(argument: _engine_QueryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  Execute(argument: _engine_QueryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  Execute(argument: _engine_QueryRequest, callback: grpc.requestCallback<_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  execute(argument: _engine_QueryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  execute(argument: _engine_QueryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  execute(argument: _engine_QueryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  execute(argument: _engine_QueryRequest, callback: grpc.requestCallback<_engine_QueryResponse__Output>): grpc.ClientUnaryCall;
  
  ExecuteStream(argument: _engine_QueryRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_engine_RowBatch__Output>;
  ExecuteStream(argument: _engine_QueryRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_engine_RowBatch__Output>;
  executeStream(argument: _engine_QueryRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_engine_RowBatch__Output>;
  executeStream(argument: _engine_QueryRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_engine_RowBatch__Output>;
  
  GetSchema(argument: _engine_SchemaRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  GetSchema(argument: _engine_SchemaRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  GetSchema(argument: _engine_SchemaRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  GetSchema(argument: _engine_SchemaRequest, callback: grpc.requestCallback<_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  getSchema(argument: _engine_SchemaRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  getSchema(argument: _engine_SchemaRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  getSchema(argument: _engine_SchemaRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  getSchema(argument: _engine_SchemaRequest, callback: grpc.requestCallback<_engine_SchemaResponse__Output>): grpc.ClientUnaryCall;
  
  InvalidateCache(argument: _engine_CacheRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  InvalidateCache(argument: _engine_CacheRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  InvalidateCache(argument: _engine_CacheRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  InvalidateCache(argument: _engine_CacheRequest, callback: grpc.requestCallback<_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  invalidateCache(argument: _engine_CacheRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  invalidateCache(argument: _engine_CacheRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  invalidateCache(argument: _engine_CacheRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  invalidateCache(argument: _engine_CacheRequest, callback: grpc.requestCallback<_engine_CacheResponse__Output>): grpc.ClientUnaryCall;
  
  TestConnection(argument: _engine_TestRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  TestConnection(argument: _engine_TestRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  TestConnection(argument: _engine_TestRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  TestConnection(argument: _engine_TestRequest, callback: grpc.requestCallback<_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  testConnection(argument: _engine_TestRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  testConnection(argument: _engine_TestRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  testConnection(argument: _engine_TestRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  testConnection(argument: _engine_TestRequest, callback: grpc.requestCallback<_engine_TestResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface QueryEngineHandlers extends grpc.UntypedServiceImplementation {
  Execute: grpc.handleUnaryCall<_engine_QueryRequest__Output, _engine_QueryResponse>;
  
  ExecuteStream: grpc.handleServerStreamingCall<_engine_QueryRequest__Output, _engine_RowBatch>;
  
  GetSchema: grpc.handleUnaryCall<_engine_SchemaRequest__Output, _engine_SchemaResponse>;
  
  InvalidateCache: grpc.handleUnaryCall<_engine_CacheRequest__Output, _engine_CacheResponse>;
  
  TestConnection: grpc.handleUnaryCall<_engine_TestRequest__Output, _engine_TestResponse>;
  
}

export interface QueryEngineDefinition extends grpc.ServiceDefinition {
  Execute: MethodDefinition<_engine_QueryRequest, _engine_QueryResponse, _engine_QueryRequest__Output, _engine_QueryResponse__Output>
  ExecuteStream: MethodDefinition<_engine_QueryRequest, _engine_RowBatch, _engine_QueryRequest__Output, _engine_RowBatch__Output>
  GetSchema: MethodDefinition<_engine_SchemaRequest, _engine_SchemaResponse, _engine_SchemaRequest__Output, _engine_SchemaResponse__Output>
  InvalidateCache: MethodDefinition<_engine_CacheRequest, _engine_CacheResponse, _engine_CacheRequest__Output, _engine_CacheResponse__Output>
  TestConnection: MethodDefinition<_engine_TestRequest, _engine_TestResponse, _engine_TestRequest__Output, _engine_TestResponse__Output>
}
