export function isTruthy<T>(value?: T   | null | false): value is T {
  return Boolean(value);
}
