export function isPlainObject(
  obj: unknown
): obj is Record<string | number | symbol, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return obj != null && (obj.constructor === Object || obj.constructor === undefined);
}
