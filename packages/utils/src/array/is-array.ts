// TODO move to type-guards
export function isArray<T, TItem>(
  maybeArr: T | readonly TItem[]
): maybeArr is readonly TItem[] {
  return Array.isArray(maybeArr);
}
