// Original file: proto/engine.proto

import type { Row as _query_engine_Row, Row__Output as _query_engine_Row__Output } from '../engine/Row';

export interface QueryResponse {
  'columns'?: (string)[];
  'rows'?: (_query_engine_Row)[];
  'rowCount'?: (number);
  'executionTimeMs'?: (number | string);
  'cached'?: (boolean);
}

export interface QueryResponse__Output {
  'columns': (string)[];
  'rows': (_query_engine_Row__Output)[];
  'rowCount': (number);
  'executionTimeMs': (number);
  'cached': (boolean);
}
