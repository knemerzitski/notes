export function wrapArray<T>(
  itemOrArr: T
): T extends readonly unknown[] | unknown[] ? T : [T] {
  if (Array.isArray(itemOrArr)) {
    // @ts-expect-error Ignore error
    return itemOrArr;
  }

  // @ts-expect-error Ignore error
  return [itemOrArr];
}
