import { JsonText } from './json-text';
import { spaceNewlineMapper } from './space-newline-mapper';
import { StructJsonFormatter } from './struct-json-formatter';
import { StringRecordStruct } from './types';

export function defineCreateJsonTextFromService<K extends string>(keys: readonly K[]) {
  const formatter = new StructJsonFormatter(keys, {
    mapper: spaceNewlineMapper
  });

  return (service: ConstructorParameters<typeof JsonText<K, StringRecordStruct>>[1]) =>
    new JsonText<K, StringRecordStruct>(formatter, service);
}
