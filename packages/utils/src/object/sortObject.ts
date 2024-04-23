/**
 * obj[key] = value
 */
interface KeyValueObject {
  key: string;
  value: unknown;
  obj: object;
}

interface SortObjectOptions {
  /**
   * Sort object value
   */
  sort?: (value: object) => boolean;
  /**
   * Exclude key from sorted result
   */
  exclude?: (args: KeyValueObject) => boolean;
}

/**
 * @returns New copy of obj that has it's keys sorted lexicographically
 */
export default function sortObject(obj: unknown, options?: SortObjectOptions): unknown {
  if (obj == null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((arrItem) => sortObject(arrItem, options));
  } else if (typeof obj === 'object' && (options?.sort?.(obj) ?? true)) {
    const castObj = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(castObj).sort();
    const sortedObj = sortedKeys.reduce<Record<string, unknown>>((newObj, key) => {
      if (!options?.exclude?.({ key, value: castObj[key], obj: castObj })) {
        newObj[key] = sortObject(castObj[key], options);
      }
      return newObj;
    }, {});

    return sortedObj;
  }

  return obj;
}
