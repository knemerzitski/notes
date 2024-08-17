/* eslint-disable @typescript-eslint/no-unsafe-assignment */
interface SplitObjectOptions {
  /**
   * Keep this key, value pair in each split object. It won't be traversed and is left as is.
   */
  keepFn?: (key: string, value: unknown) => boolean;
  /**
   * Condition for splitting the value.
   * By default primitive values: number, string, boolean, null, undefined
   */
  splitFn?: (value: unknown) => boolean;
}

function isPrimitive(value: unknown): boolean {
  return (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value == null
  );
}

/**
 * Takes one big object and splits it up into separate objects.
 * Each object will have only one primitive value
 */
export function splitObject<T extends object>(
  obj: T,
  options?: SplitObjectOptions,
  fromParentPathObj: (innerObj: Record<string, unknown>) => Record<string, unknown> = (
    obj
  ) => obj
): T[] {
  const isPrim = options?.splitFn ?? isPrimitive;

  const entries = Object.entries(obj);

  // Handle simple cases, len 0 or 1
  if (entries.length === 0) {
    return [];
  } else if (entries.length === 1) {
    const firstValue = entries[0]?.[1];
    if (isPrim(firstValue)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
      return [fromParentPathObj(obj as any) as any];
    }
  }

  const splitObjs: Record<string, unknown>[] = [];

  // Make a copy of object to be passed down based on 'keepKeysUnmodified'
  const commonObj: Record<string, unknown> = {};
  if (options?.keepFn) {
    for (const [key, value] of entries) {
      if (options.keepFn(key, value)) {
        commonObj[key] = value;
      }
    }
  }

  for (const [key, value] of entries) {
    // Ignore keys already in extraPathObj
    if (key in commonObj) continue;

    if (isPrim(value)) {
      // Creates nested path of objects with single value
      splitObjs.push(fromParentPathObj({ ...commonObj, [key]: value }));
    } else if (value != null && typeof value === 'object') {
      splitObjs.push(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ...splitObject(value, options, (innerObj) =>
          fromParentPathObj({
            ...commonObj,
            [key]: {
              ...innerObj,
            },
          })
        )
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return splitObjs as any;
}
