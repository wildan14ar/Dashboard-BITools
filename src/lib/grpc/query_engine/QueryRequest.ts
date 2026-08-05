// Original file: proto/query_engine.proto


export interface QueryRequest {
  'sourceId'?: (string);
  'sql'?: (string);
  'maxRows'?: (number);
  'timeoutSec'?: (number);
  'params'?: ({[key: string]: string});
  'dbType'?: (string);
  'configJson'?: (string);
}

export interface QueryRequest__Output {
  'sourceId'?: (string);
  'sql'?: (string);
  'maxRows'?: (number);
  'timeoutSec'?: (number);
  'params'?: ({[key: string]: string});
  'dbType'?: (string);
  'configJson'?: (string);
}
