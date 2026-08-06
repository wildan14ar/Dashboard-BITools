// Original file: proto/engine.proto


export interface QueryRequest {
  'sourceId'?: (string);
  'sql'?: (string);
  'maxRows'?: (number);
  'timeoutSec'?: (number);
  'params'?: ({[key: string]: string});
  'dbType'?: (string);
  'configJson'?: (string);
  'useCache'?: (boolean);
  'limit'?: (number);
  'offset'?: (number);
}

export interface QueryRequest__Output {
  'sourceId': (string);
  'sql': (string);
  'maxRows': (number);
  'timeoutSec': (number);
  'params': ({[key: string]: string});
  'dbType': (string);
  'configJson': (string);
  'useCache': (boolean);
  'limit': (number);
  'offset': (number);
}
