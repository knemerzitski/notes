import { coerce, defaulted, Infer, InferRaw, string, type } from 'superstruct';

import { JsonFormatter, StringRecordStruct } from './types';

export class StructJsonFormatter<
  K extends string = string,
  S extends StringRecordStruct = StringRecordStruct,
> implements JsonFormatter
{
  private readonly struct;

  constructor(readonly keys: readonly K[]) {
    this.struct = createStringRecordStruct(keys);
  }

  parse(value: InferRaw<S>): Infer<S> {
    return this.struct.create(value);
  }

  stringify(value: Infer<S>): InferRaw<S> {
    return this.struct.createRaw(value);
  }

  parseString(value: string): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return JSON.parse(`"${value}"`);
  }

  stringifyString(value: string): string {
    return JSON.stringify(value).slice(1, -1);
  }
}

function createStringRecordStruct<K extends string>(
  keys: readonly K[]
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
        const jsonValue = JSON.parse(value);
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
      return JSON.stringify(value);
    }
  );
}
