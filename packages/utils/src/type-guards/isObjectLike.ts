export default function isObjectLike(
  obj: unknown
): obj is Record<string | number | symbol, unknown> {
  return obj != null && typeof obj === 'object';
}
