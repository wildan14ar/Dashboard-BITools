// Original file: proto/engine.proto

import type { Row as _engine_Row, Row__Output as _engine_Row__Output } from '../engine/Row';

export interface QueryResponse {
  'columns'?: (string)[];
  'rows'?: (_engine_Row)[];
  'rowCount'?: (number);
  'executionTimeMs'?: (number | string);
  'cached'?: (boolean);
}

export interface QueryResponse__Output {
  'columns'?: (string)[];
  'rows'?: (_engine_Row__Output)[];
  'rowCount'?: (number);
  'executionTimeMs'?: (number);
  'cached'?: (boolean);
}
