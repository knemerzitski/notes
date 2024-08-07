/**
 * Group array items in a map using item[itemKey] value
 */
export default function groupBy<T, TKey extends string | number | symbol>(
  array: readonly T[],
  keyFn: (item: T) => TKey
) {
  return array.reduce(
    (map, item) => {
      const key = keyFn(item);
      const existing = map[key];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (existing) {
        existing.push(item);
      } else {
        map[key] = [item];
      }
      return map;
    },
    // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
    {} as Record<TKey, T[]>
  );
}
