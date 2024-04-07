/**
 * Merges two arrays that are consecutive ordered by checking boundaries.
 * @returns New merged array.
 */
export default function mergedConsecutiveOrdered<T>(
  a: Readonly<T[]>,
  b: Readonly<T[]>,
  orderFn: (item: T) => number
): T[] | undefined {
  const aStart = a[0];
  if (aStart === undefined) return [...b];
  let aEnd = a[a.length - 1];
  if (aEnd === undefined) return [...b];

  const bStart = b[0];
  if (bStart === undefined) return [...a];
  let bEnd = b[b.length - 1];
  if (bEnd === undefined) return [...a];

  let aStartOrder = orderFn(aStart);
  let bStartOrder = orderFn(bStart);
  if (bStartOrder < aStartOrder) {
    [bStartOrder, aStartOrder] = [aStartOrder, bStartOrder];
    [b, a] = [a, b];
    [bEnd, aEnd] = [aEnd, bEnd];
  }
  const aEndOrder = orderFn(aEnd);

  const aOffset = aEndOrder - bStartOrder;
  if (aOffset < -1) return;
  if (aOffset >= b.length) return [...a];

  const aSliceEnd = a.length - 1 - aOffset;

  const result = [...a.slice(0, aSliceEnd), ...b];
  return result;
}
