// TODO move to type-guards
export function isArray<T, TItem>(
  maybeArr: T | readonly TItem[]
): maybeArr is readonly TItem[];
export function isArray<T, TItem>(maybeArr: T | TItem[]): maybeArr is TItem[] {
  return Array.isArray(maybeArr);
}
