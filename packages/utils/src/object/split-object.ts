/* eslint-disable @typescript-eslint/no-unsafe-assignment */
interface SplitObjectOptions {
  /**
   * Objects in these keys are kept as is without modification
   */
  keepKeysUnmodified?: string[];
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

  const result: Record<string, unknown>[] = [];

  // Make a copy of object to be passed down based on 'keepKeysUnmodified'
  const extraPathObj: Record<string, unknown> = {};
  if (options?.keepKeysUnmodified && options.keepKeysUnmodified.length > 0) {
    for (const [key, value] of entries) {
      if (options.keepKeysUnmodified.includes(key)) {
        extraPathObj[key] = value;
      }
    }
  }

  for (const [key, value] of entries) {
    // Ignore keys already in extraPathObj
    if (key in extraPathObj) continue;

    if (isPrim(value)) {
      // Creates nested path of objects with single value
      result.push(fromParentPathObj({ [key]: value }));
    } else if (value != null && typeof value === 'object') {
      result.push(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ...splitObject(value, options, (innerObj) =>
          fromParentPathObj({
            ...extraPathObj,
            [key]: {
              ...innerObj,
            },
          })
        )
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return result as any;
}
