export interface Serializable<I> {
  serialize(): I;
}
export interface Parseable<T> {
  parseValue(value: unknown): T | undefined;
}

export class ParseError extends Error {}

export function assertIsObject<T>(obj: T): asserts obj is T & object {
  if (obj == null || typeof obj !== 'object') {
    throw new ParseError(`Expected an object`);
  }
}

export function assertIsKeyArray<T, Key extends string | number | symbol>(
  obj: T,
  keys: Key[]
): asserts obj is T & Record<Key, unknown> {
  assertIsObject(obj);

  for (const key of keys) {
    if (!(key in obj)) {
      throw new ParseError(`Expected object to have property ${String(key)}`);
    }
  }
}


export function assertHasProperties<T, Key extends string | number | symbol>(
  obj: T,
  keys: Key[]
): asserts obj is T & Record<Key, unknown> {
  assertIsObject(obj);

  for (const key of keys) {
    if (!(key in obj)) {
      throw new ParseError(`Expected object to have property ${String(key)}`);
    }
  }
}

export function parseOrDefault<T, R>(fn: () => T, def: R): T | R {
  try {
    return fn();
  } catch (err) {
    if (err instanceof ParseError) {
      return def;
    }
    throw err;
  }
}

export function parseNumber(value: unknown): number {
  const nr = Number(value);
  if (Number.isNaN(nr)) {
    throw new ParseError(`Expected ${value} to be a number`);
  }
  return nr;
}
