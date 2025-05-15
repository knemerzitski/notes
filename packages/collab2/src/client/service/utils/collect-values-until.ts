export function collectValuesUntil<T>(
  values: Iterable<T>,
  map: (value: T) => {
    value: T;
    done: boolean;
  }
): T[] {
  const result: T[] = [];
  for (const value of values) {
    const { value: mappedValue, done } = map(value);
    result.push(mappedValue);
    if (done) {
      return result;
    }
  }
  return result;
}
