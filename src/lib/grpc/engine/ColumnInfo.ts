// Original file: proto/engine.proto

import type { ForeignKey as _engine_ForeignKey, ForeignKey__Output as _engine_ForeignKey__Output } from '../engine/ForeignKey';

export interface ColumnInfo {
  'name'?: (string);
  'type'?: (string);
  'nullable'?: (boolean);
  'isPrimaryKey'?: (boolean);
  'foreignKey'?: (_engine_ForeignKey | null);
}

export interface ColumnInfo__Output {
  'name'?: (string);
  'type'?: (string);
  'nullable'?: (boolean);
  'isPrimaryKey'?: (boolean);
  'foreignKey'?: (_engine_ForeignKey__Output);
}
