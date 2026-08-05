// Original file: proto/query_engine.proto

import type { TableInfo as _query_engine_TableInfo, TableInfo__Output as _query_engine_TableInfo__Output } from '../query_engine/TableInfo';

export interface SchemaResponse {
  'tables'?: (_query_engine_TableInfo)[];
}

export interface SchemaResponse__Output {
  'tables'?: (_query_engine_TableInfo__Output)[];
}
