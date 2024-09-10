/* eslint-disable @typescript-eslint/no-explicit-any */
import { Struct, never } from 'superstruct';
import { isObjectLike } from '../type-guards/is-object-like';
import { PickerDeep, PickDeep, PickValue } from '../types';

/**
 * TODO test if can pick property from infer or inferraw?
 * Recursive version of pick using a picker object.
 *
 * Curried function order:
 * - Struct object: pickdeep(Struct)
 * - Type of values that can be picked \<P\>()
 * - Picker object ({...picker})
 */
export function pickdeep<T, S, R>(struct: Struct<T, S, R>, options?: PickDeepOptions) {
  function curryPrimitive<P>() {
    function curryPick<V extends PickerDeep<T & S & R, P>>(
      pick: V
    ): Struct<PickDeep<T, V, P>, PickDeep<S, V, P>, PickDeep<R, V, P>> {
      return _pickdeep(struct, pick, options);
    }
    return curryPick;
  }
  return curryPrimitive;
}

interface PickDeepOptions {
  /**
   * Convert any 'object' to 'type' to allow for unspecified properties
   * @default false
   */
  convertObjectToType?: boolean;
}

/**
 * Without typescript safety and non-curry.
 */
function _pickdeep<T, S, R>(
  struct: Struct<T, S, R>,
  pick: PickValue | Record<string, unknown>,
  options?: PickDeepOptions
): any {
  if (pick === 1) {
    return struct;
  }

  if (struct.type === 'array') {
    if (!(struct.schema instanceof Struct)) {
      return struct;
    }
    return arrayFromStruct(_pickdeep(struct.schema, pick, options), struct);
  }

  if (!isObjectLike(struct.schema)) {
    return struct;
  }

  const pickedSchema: any = {};

  for (const key of Object.keys(pick)) {
    const subPick = pick[key];
    const subStruct = struct.schema[key];
    if (!subStruct) continue;

    if (subPick === 1) {
      pickedSchema[key] = subStruct;
    } else if (isObjectLike(subPick) && subStruct instanceof Struct) {
      pickedSchema[key] = _pickdeep(subStruct, subPick, options);
    }
  }

  if (
    struct.type === 'type' ||
    (options?.convertObjectToType && struct.type === 'object')
  ) {
    return typeFromStruct(pickedSchema, struct) as any;
  } else if (struct.type === 'object') {
    return objectFromStruct(pickedSchema, struct);
  }

  throw new Error(`Unexpected struct type '${struct.type}'`);
}

function isObject(x: unknown): x is object {
  return typeof x === 'object' && x != null;
}

export function objectFromStruct(schema: any, struct: Struct<any, any, any>): any {
  if (struct.type !== 'object') {
    throw new Error('Struct must be object to make a copy');
  }

  const knowns = schema ? Object.keys(schema) : [];
  const Never = never();
  return new Struct({
    ...struct,
    schema,
    *entries(value) {
      if (schema && isObject(value)) {
        const unknowns = new Set(Object.keys(value));

        for (const key of knowns) {
          unknowns.delete(key);
          // @ts-expect-error Ignore the error
          yield [key, value[key], schema[key]];
        }

        for (const key of unknowns) {
          // @ts-expect-error Ignore the error
          yield [key, value[key], Never];
        }
      }
    },
  });
}

export function typeFromStruct(schema: any, struct: Struct<any, any, any>) {
  if (struct.type !== 'object' && struct.type !== 'type') {
    throw new Error('Struct must be type or object to make a copy');
  }

  const keys = Object.keys(schema);
  return new Struct({
    ...struct,
    type: 'type',
    schema,
    *entries(value) {
      if (isObject(value)) {
        for (const k of keys) {
          // @ts-expect-error Ignore the error
          yield [k, value[k], schema[k]];
        }
      }
    },
  });
}

export function arrayFromStruct(Element: any, struct: Struct<any, any, any>): any {
  if (struct.type !== 'array') {
    throw new Error('Struct must be array to make a copy');
  }

  return new Struct({
    ...struct,
    schema: Element,
    *entries(value) {
      if (Element && Array.isArray(value)) {
        for (const [i, v] of value.entries()) {
          yield [i, v, Element];
        }
      }
    },
  });
}
