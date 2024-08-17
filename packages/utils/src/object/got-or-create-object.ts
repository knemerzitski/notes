import { isObjectLike } from '../type-guards/is-object-like';

export function getOrCreateObject(
  obj: Record<string | number | symbol, unknown>,
  key: string
): Record<string | number | symbol, unknown> {
  let value = obj[key];
  if (!isObjectLike(value)) {
    value = {};
    obj[key] = value;
  }

  return value as Record<string | number | symbol, unknown>;
}
