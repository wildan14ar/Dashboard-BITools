// Original file: proto/query_engine.proto

import type { Row as _query_engine_Row, Row__Output as _query_engine_Row__Output } from '../query_engine/Row';

export interface RowBatch {
  'columns'?: (string)[];
  'rows'?: (_query_engine_Row)[];
  'isLast'?: (boolean);
}

export interface RowBatch__Output {
  'columns'?: (string)[];
  'rows'?: (_query_engine_Row__Output)[];
  'isLast'?: (boolean);
}
