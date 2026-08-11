// Original file: proto/engine.proto

import type { TableInfo as _engine_TableInfo, TableInfo__Output as _engine_TableInfo__Output } from '../engine/TableInfo';

export interface SchemaResponse {
  'tables'?: (_engine_TableInfo)[];
}

export interface SchemaResponse__Output {
  'tables'?: (_engine_TableInfo__Output)[];
}
