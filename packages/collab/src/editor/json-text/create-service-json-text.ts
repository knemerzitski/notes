import { Emitter } from 'mitt';

import { Logger } from '../../../../utils/src/logging';

import { JsonText } from './json-text';
import { spaceNewlineMapper } from './space-newline-mapper';
import { StructJsonFormatter } from './struct-json-formatter';
import { JsonTextEvents, StringRecordStruct } from './types';

export function defineCreateJsonTextFromService<K extends string>(
  keys: readonly [K, ...K[]],
  options?: {
    defaultKey?: K;
    logger?: Logger;
    eventBus?: Pick<Emitter<JsonTextEvents>, 'emit'>;
  }
) {
  const formatter = new StructJsonFormatter(keys, {
    mapper: spaceNewlineMapper,
    defaultKey: options?.defaultKey,
    logger: options?.logger?.extend('StructJsonFormatter'),
    eventBus: options?.eventBus,
  });

  return (service: ConstructorParameters<typeof JsonText<K, StringRecordStruct>>[1]) =>
    new JsonText<K, StringRecordStruct>(formatter, service, {
      logger: options?.logger?.extend('JsonText'),
    });
}
