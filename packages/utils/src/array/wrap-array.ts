export function wrapArray<T>(itemOrArr: T): T extends unknown[] ? T : [T] {
  if (Array.isArray(itemOrArr)) {
    // @ts-expect-error Ignore error
    return itemOrArr;
  }

  // @ts-expect-error Ignore error
  return [itemOrArr];
}
