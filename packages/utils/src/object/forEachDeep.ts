export default function forEachDeep(
  obj: object,
  fn: (
    value: [string, unknown],
    index: number,
    array: [string, unknown][]
  ) => boolean | undefined
) {
  Object.entries(obj).forEach((entry, index, array) => {
    if (fn(entry, index, array) === false) return;
    const value: unknown = entry[1];
    if (value && typeof value === 'object') {
      forEachDeep(value, fn);
    }
  });
}
