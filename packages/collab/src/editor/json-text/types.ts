import { Struct } from 'superstruct';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface JsonFormatter<T = any> {
  parse(value: string): T;
  stringify(value: T): string;
  parseString(value: string): string;
  stringifyString(value: string): string;
}

export type StringRecordStruct = Struct<
  Record<string, string>,
  Record<string, Struct<string, null, string>>,
  string
>;

export interface KeyViewText {
  value: string;
  jsonValueOffset: number;
  jsonValueLength: number;
}

export interface JsonTextEvents {
  error: unknown;
}
