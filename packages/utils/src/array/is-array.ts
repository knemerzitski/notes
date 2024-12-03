// TODO move to type-guards
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function isArray<T, TItem>(
  maybeArr: T | readonly TItem[]
): maybeArr is readonly TItem[];
export function isArray<T, TItem>(maybeArr: T | TItem[]): maybeArr is TItem[] {
  return Array.isArray(maybeArr);
}
