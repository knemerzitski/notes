import { isObjectLike } from '../type-guards/is-object-like';
import { isPlainObject } from '../type-guards/is-plain-object';

export interface MapDeepOptions {
  /**
   * -1 depth without limit. Whole object is mapped.
   * @default -1
   */
  maxDepth?: number;
  /**
   * Which type of objects are traversed
   * @default 'plain-object-and-array'
   */
  traverseCond?: 'object-like' | 'plain-object-and-array';
}

// TODO test
/**
 * Maps values in value until options.maxDepth is reached or value is mapped.
 * Does not recursevly map the mapped value itself.
 */
export function mapDeep(
  value: unknown,
  mapFn: (value: unknown) => unknown,
  options?: MapDeepOptions,
  depth = 0
) {
  const maxDepth = options?.maxDepth ?? -1;
  if (maxDepth !== -1 && maxDepth < depth) {
    return value;
  }

  const newValue = mapFn(value);
  if (newValue !== value) {
    return newValue;
  }

  const traverseAllObjects = options?.traverseCond === 'object-like';

  if (
    traverseAllObjects
      ? isObjectLike(value)
      : isPlainObject(value) || Array.isArray(value)
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return Object.entries(value as object).reduce<any>(
      (result, [subKey, subValue]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        result[subKey] = mapDeep(subValue, mapFn, options, depth + 1);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return result;
      },
      Array.isArray(value) ? [] : {}
    );
  }

  return value;
}
