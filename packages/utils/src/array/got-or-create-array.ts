export function getOrCreateArray(
  obj: Record<string | number | symbol, unknown>,
  key: string
): unknown[] {
  let value = obj[key];
  if (!Array.isArray(value)) {
    value = [];
    obj[key] = value;
  }

  return value as unknown[];
}
