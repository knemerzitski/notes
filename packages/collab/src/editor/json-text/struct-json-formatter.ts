import { coerce, defaulted, Infer, InferRaw, string, type } from 'superstruct';

import { JsonFormatter, StringRecordStruct } from './types';

export interface StructJsonMapper {
  preStringify(value: string): string;
  postParse(value: string): string;
}

export class StructJsonFormatter<
  K extends string = string,
  S extends StringRecordStruct = StringRecordStruct,
> implements JsonFormatter<Infer<S>>
{
  private readonly struct;

  private readonly mapper;

  constructor(
    readonly keys: readonly K[],
    options?: {
      mapper?: StructJsonMapper;
    }
  ) {
    this.struct = createStringRecordStruct(keys, {
      parse: JSON.parse,
      stringify: JSON.stringify,
    });
    this.mapper = options?.mapper;
  }

  parse(value: InferRaw<S>): Infer<S> {
    const parsed = this.struct.create(value);

    if (this.mapper?.postParse) {
      for (const key of this.keys) {
        const subValue = parsed[key];
        if (subValue != null) {
          parsed[key] = this.mapper.postParse(subValue);
        }
      }
    }

    return parsed;
  }

  stringify(value: Infer<S>): InferRaw<S> {
    if (this.mapper?.preStringify) {
      value = { ...value };
      for (const key of this.keys) {
        const subValue = value[key];
        if (subValue != null) {
          value[key] = this.mapper.preStringify(subValue) as Infer<S>[K];
        }
      }
    }

    return this.struct.createRaw(value);
  }

  parseString(value: string): string {
    let parsed = JSON.parse(`"${value}"`) as string;

    if (this.mapper?.postParse) {
      parsed = this.mapper.postParse(parsed);
    }

    return parsed;
  }

  stringifyString(value: string): string {
    if (this.mapper?.preStringify) {
      value = this.mapper.preStringify(value);
    }

    return JSON.stringify(value).slice(1, -1);
  }
}

function createStringRecordStruct<K extends string>(
  keys: readonly K[],
  params: {
    parse: typeof JSON.parse;
    stringify: typeof JSON.stringify;
  }
): StringRecordStruct {
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
        console.error(err);
        if (keys[0]) {
          return {
            [keys[0]]: value,
          };
        }
      }
      return;
    },
    (value) => {
      return params.stringify(value);
    }
  );
}
