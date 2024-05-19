/* eslint-disable @typescript-eslint/no-non-null-assertion */
import binarySearchIndexOf from './binarySearchIndexOf';

interface SpliceArguments<T> {
  start: number;
  deleteCount: number;
  items: Readonly<T[]>;
}

/**
 * E.g consecutive array [1,2,3,6,7,11]
 *
 * @param targetArr Target for splicing
 * @param insertArr Array to be inserted
 * @param orderFn Order of item in array
 * @returns Arguments for splicing {@link insertArr} into {@link targetArr}
 * so that result array stays ordered and unique.
 */
export default function findSpliceConsecutiveArray<T>(
  targetArr: Readonly<T[]>,
  insertArr: Readonly<T[]>,
  cmp: (a: T, b: T) => number
): SpliceArguments<T> | undefined {
  if (insertArr.length === 0) return;

  if (insertArr.length === 1) {
    const { index, exists } = binarySearchIndexOf(targetArr, insertArr[0]!, cmp);
    if (exists) return;
    return {
      start: index,
      deleteCount: 0,
      items: insertArr,
    };
  }

  const insertStartItem = insertArr[0]!;
  const insertEndItem = insertArr[insertArr.length - 1]!;

  const { index: startIndex } = binarySearchIndexOf(targetArr, insertStartItem, cmp);
  const { index: endIndex, exists: endExists } = binarySearchIndexOf(
    targetArr,
    insertEndItem,
    cmp
  );

  const length = endIndex - startIndex + (endExists ? 1 : 0);
  if (length === insertArr.length) {
    return;
  }

  return {
    start: startIndex,
    deleteCount: length,
    items: insertArr,
  };
}
