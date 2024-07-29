import isObjectLike from '../type-guards/isObjectLike';

/**
 * Recursively copies values from {@link source} to {@link object}.
 *
 * If {@link object} is not object then {@link source} is returned
 * If {@link source} is not object then {@link object} is returned unmodified
 */
export default function mergeTwoObjects(object: unknown, source: unknown): unknown {
  if (!isObjectLike(object)) return source;
  if (!isObjectLike(source)) return object;

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    object[key] = mergeTwoObjects(object[key], sourceValue);
  }

  return object;
}
