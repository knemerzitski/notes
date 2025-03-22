import { Emitter } from 'mitt';
import { coerce, defaulted, Infer, InferRaw, string, type } from 'superstruct';

import { Logger } from '../../../../utils/src/logging';

import { JsonFormatter, JsonTextEvents, StringRecordStruct } from './types';

export interface StructJsonMapper {
  preStringify(value: string): string;
  postParse(value: string): string;
}

export class StructJsonFormatter<
  K extends string = string,
  S extends StringRecordStruct = StringRecordStruct,
> implements JsonFormatter<Infer<S>>
{
  private readonly logger;

  private readonly struct;

  private readonly mapper;

  constructor(
    readonly keys: readonly [K, ...K[]],
    options?: {
      defaultKey?: K;
      mapper?: StructJsonMapper;
      logger?: Logger;
      eventBus?: Pick<Emitter<JsonTextEvents>, 'emit'>;
    }
  ) {
    this.logger = options?.logger;

    this.struct = createStringRecordStruct(
      keys,
      {
        parse: JSON.parse,
        stringify: JSON.stringify,
      },
      {
        defaultKey: options?.defaultKey,
        logger: this.logger,
        eventBus: options?.eventBus,
      }
    );
    this.mapper = options?.mapper;
  }

  parse(value: InferRaw<S>): Infer<S> {
    this.logger?.debug('parse', value);
    const parsed = this.struct.create(value);

    if (this.mapper?.postParse) {
      for (const key of this.keys) {
        const subValue = parsed[key];
        if (subValue != null) {
          parsed[key] = this.mapper.postParse(subValue);
        }
      }
    }

    this.logger?.debug('parse:result', parsed);

    return parsed;
  }

  stringify(value: Infer<S>): InferRaw<S> {
    this.logger?.debug('stringify', value);
    if (this.mapper?.preStringify) {
      value = { ...value };
      for (const key of this.keys) {
        const subValue = value[key];
        if (subValue != null) {
          value[key] = this.mapper.preStringify(subValue) as Infer<S>[K];
        }
      }
    }

    const result = this.struct.createRaw(value);

    this.logger?.debug('stringify:result', result);

    return result;
  }

  parseString(value: string): string {
    this.logger?.debug('parseString', value);
    let parsed = JSON.parse(`"${value}"`) as string;

    if (this.mapper?.postParse) {
      parsed = this.mapper.postParse(parsed);
    }

    this.logger?.debug('parseString:result', parsed);

    return parsed;
  }

  stringifyString(value: string): string {
    this.logger?.debug('stringifyString', value);

    if (this.mapper?.preStringify) {
      value = this.mapper.preStringify(value);
    }

    const result = JSON.stringify(value).slice(1, -1);

    this.logger?.debug('stringifyString:result', result);

    return result;
  }
}

function createStringRecordStruct<K extends string>(
  keys: readonly [K, ...K[]],
  params: {
    parse: typeof JSON.parse;
    stringify: typeof JSON.stringify;
  },
  options?: {
    defaultKey?: K;
    logger?: Logger;
    eventBus?: Pick<Emitter<JsonTextEvents>, 'emit'>;
  }
): StringRecordStruct {
  const logger = options?.logger;

  const defaultKey = options?.defaultKey ?? keys[0];

  return coerce(
    defaulted(
      type(Object.fromEntries(keys.map((key) => [key, defaulted(string(), () => '')]))),
      () => ({})
    ),
    string(),
    (value) => {
      if (value.trim().length === 0) {
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonValue = params.parse(value);
        if (typeof jsonValue === 'string' && keys[0]) {
          return {
            [keys[0]]: jsonValue,
          };
        }
        return jsonValue;
      } catch (err) {
        logger?.error('params.parse', {
          value,
          err,
        });

        options?.eventBus?.emit(
          'error',
          new Error('params.parse', {
            cause: err,
          })
        );

        // Retain whole value in default key
        return {
          [defaultKey]: value,
        };
      }
      return;
    },
    (value) => {
      return params.stringify(value);
    }
  );
}
