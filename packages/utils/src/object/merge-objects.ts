import { isObjectLike } from '../type-guards/is-object-like';

/**
 * Recursively copies values from {@link sources} to {@link object}.
 *
 * If {@link object} is not object then {@link sources} is returned
 * If {@link sources} is not object then {@link object} is returned unmodified
 */
export function mergeObjects(object: unknown, ...sources: unknown[]): unknown {
  for (const source of sources) {
    object = mergeTwoObjects(object, source);
  }
  return object;
}

/**
 * Copies objects by creating a new copy
 */
export function mergedObjects(...sources: unknown[]): unknown {
  const first = sources[0];
  if (!isObjectLike(first)) return first;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let object: any = Array.isArray(first) ? [] : {};

  for (const source of sources) {
    object = mergeTwoObjects(object, source);
  }
  return object;
}

function mergeTwoObjects(object: unknown, source: unknown): unknown {
  if (!isObjectLike(object)) return source;
  if (!isObjectLike(source)) return object;

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    if (object[key] !== sourceValue) {
      object[key] = mergeTwoObjects(object[key], sourceValue);
    }
  }

  return object;
}
