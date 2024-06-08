export default function isNonEmptyArray<T>(
  maybeNonEmptyArray: Readonly<T[]>
): maybeNonEmptyArray is Readonly<[T, ...T[]]> {
  return maybeNonEmptyArray.length > 0 && maybeNonEmptyArray[0] !== undefined;
}

export function isNonEmptyMutableArray<T>(
  maybeNonEmptyArray: Readonly<T[]>
): maybeNonEmptyArray is [T, ...T[]] {
  return maybeNonEmptyArray.length > 0 && maybeNonEmptyArray[0] !== undefined;
}
