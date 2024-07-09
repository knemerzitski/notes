/* eslint-disable @typescript-eslint/no-non-null-assertion */

export interface BinarySearchIndexOfResult {
  /**
   * Index or insertion index of item
   */
  index: number;
  /**
   * If item exists then index is indexOf item. If item doesn't exist
   * then index is insertion index to keep array sorted.
   *
   */
  exists: boolean;
}

/**
 * Binary search index of item in array. Array must be sorted.
 */
export function binarySearchIndexOf<T>(
  arr: readonly T[],
  item: T,
  compareFn: (a: T, b: T) => number,
  left = 0,
  right = arr.length - 1
): BinarySearchIndexOfResult {
  if (right < left) {
    return { index: left, exists: false };
  }
  const mid = Math.floor((right + left) / 2);

  const cmpResult = compareFn(arr[mid]!, item);
  if (cmpResult < 0) {
    // Mid is smaller
    return binarySearchIndexOf(arr, item, compareFn, mid + 1, right);
  } else if (cmpResult > 0) {
    // Mid is bigger
    return binarySearchIndexOf(arr, item, compareFn, left, mid - 1);
  } else {
    return { index: mid, exists: true };
  }
}
