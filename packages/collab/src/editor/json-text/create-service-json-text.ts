import { JsonText } from './json-text';
import { StructJsonFormatter } from './struct-json-formatter';
import { StringRecordStruct } from './types';

export function defineCreateJsonTextFromService<K extends string>(keys: readonly K[]) {
  const formatter = new StructJsonFormatter(keys);

  return (service: ConstructorParameters<typeof JsonText<K, StringRecordStruct>>[1]) =>
    new JsonText<K, StringRecordStruct>(formatter, service);
}
