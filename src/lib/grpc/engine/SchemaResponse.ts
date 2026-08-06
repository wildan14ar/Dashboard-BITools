// Original file: proto/engine.proto

import type { TableInfo as _query_engine_TableInfo, TableInfo__Output as _query_engine_TableInfo__Output } from '../engine/TableInfo';

export interface SchemaResponse {
  'tables'?: (_query_engine_TableInfo)[];
}

export interface SchemaResponse__Output {
  'tables': (_query_engine_TableInfo__Output)[];
}
