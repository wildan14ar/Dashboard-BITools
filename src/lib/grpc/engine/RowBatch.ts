// Original file: proto/engine.proto

import type { Row as _engine_Row, Row__Output as _engine_Row__Output } from '../engine/Row';

export interface RowBatch {
  'columns'?: (string)[];
  'rows'?: (_engine_Row)[];
  'isLast'?: (boolean);
}

export interface RowBatch__Output {
  'columns'?: (string)[];
  'rows'?: (_engine_Row__Output)[];
  'isLast'?: (boolean);
}
