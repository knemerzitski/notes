/**
 * @returns New copy of obj that has it's keys sorted lexicographically
 */
export default function sortObject(
  obj: unknown,
  isObject?: (value: object) => boolean
): unknown {
  if (obj == null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((arrItem) => sortObject(arrItem, isObject));
  } else if (typeof obj === 'object' && (isObject?.(obj) ?? true)) {
    const castObj = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(castObj).sort();
    const sortedObj = sortedKeys.reduce<Record<string, unknown>>((newObj, key) => {
      newObj[key] = sortObject(castObj[key], isObject);
      return newObj;
    }, {});

    return sortedObj;
  }

  return obj;
}
