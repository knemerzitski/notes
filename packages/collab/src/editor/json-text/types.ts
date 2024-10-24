import { Struct } from 'superstruct';

export interface JsonFormatter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parse(value: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stringify(value: any): string;
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