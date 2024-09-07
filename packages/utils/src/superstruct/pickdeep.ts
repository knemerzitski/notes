/* eslint-disable @typescript-eslint/no-explicit-any */
import { array, object, Struct, type } from 'superstruct';
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

  const { schema } = struct;

  if (struct.type === 'array') {
    if (!(schema instanceof Struct)) {
      return struct;
    }
    return array(_pickdeep(schema, pick, options));
  }

  if (!isObjectLike(schema)) {
    return struct;
  }

  const resultSchema: any = {};

  for (const key of Object.keys(pick)) {
    const subPick = pick[key];
    const subStruct = schema[key];
    if (!subStruct) continue;

    if (subPick === 1) {
      resultSchema[key] = subStruct;
    } else if (isObjectLike(subPick) && subStruct instanceof Struct) {
      resultSchema[key] = _pickdeep(subStruct, subPick, options);
    }
  }

  if (options?.convertObjectToType) {
    return type(resultSchema) as any;
  }

  switch (struct.type) {
    case 'type':
      return type(resultSchema) as any;
    default:
      return object(resultSchema) as any;
  }
}
