interface IsEmptyDeepOptions {
  /**
   * Condition for splitting the value.
   * By default null or undefined
   */
  isEmptyValue?: (value: unknown) => boolean;
}

function isEmptyValue(value: unknown): boolean {
  return value == null;
}

/**
 * @returns True if value contains only null or undefined values
 * or objects and arrays with null or undefined values.
 */
export default function isEmptyDeep(obj: unknown, options?: IsEmptyDeepOptions): boolean {
  const isEmpty = options?.isEmptyValue ?? isEmptyValue;
  if (isEmpty(obj)) {
    return true;
  }

  if (obj != null && typeof obj === 'object') {
    if (Object.keys(obj).length === 0) return true;
    return Object.values(obj).every((val) => isEmptyDeep(val));
  }

  return false;
}
