/**
 * @returns Index of item in array or -1 if not found.
 */
export function consecutiveArrayIndexOf<T>(
  items: T[],
  order: number,
  orderFn: (item: T) => number
) {
  if (!isConsecutiveArray(items, orderFn)) {
    throw new Error(
      'Expected an array with consecutive elements. Cannot index non-consecutive array'
    );
  }
  const lastItem = items[items.length - 1];
  if (!lastItem) return -1;

  const result = order + (items.length - orderFn(lastItem)) - 1;
  if (result < 0 || result >= items.length) return -1;

  return result;
}

/**
 * Array must be sorted.
 */
export function isConsecutiveArray<T>(items: T[], orderFn: (item: T) => number) {
  const firstItem = items[0];
  if (!firstItem) return true;
  const lastItem = items[items.length - 1];
  if (!lastItem) return true;
  if (firstItem === lastItem) return true;

  return orderFn(lastItem) - orderFn(firstItem) + 1 === items.length;
}
