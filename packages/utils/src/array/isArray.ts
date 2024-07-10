export default function isArray<T, TItem>(
  maybeArr: T | readonly TItem[]
): maybeArr is readonly TItem[] {
  return Array.isArray(maybeArr);
}
