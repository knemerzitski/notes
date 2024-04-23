/**
 * @returns True if value contains only null or undefined values
 * or objects and arrays with null or undefined values.
 */
export default function isEmptyDeep(obj: unknown): boolean {
  if (obj == null) {
    return true;
  }
  if (typeof obj === 'object') {
    if (Object.keys(obj).length === 0) return true;
    return Object.values(obj).every((val) => isEmptyDeep(val));
  }

  return false;
}
