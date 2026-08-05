// Original file: proto/query_engine.proto

import type { ColumnInfo as _query_engine_ColumnInfo, ColumnInfo__Output as _query_engine_ColumnInfo__Output } from '../query_engine/ColumnInfo';

export interface TableInfo {
  'name'?: (string);
  'schema'?: (string);
  'columns'?: (_query_engine_ColumnInfo)[];
}

export interface TableInfo__Output {
  'name'?: (string);
  'schema'?: (string);
  'columns'?: (_query_engine_ColumnInfo__Output)[];
}
