/* eslint-disable @typescript-eslint/no-non-null-assertion */

interface BinarySearchIndexOfResult {
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
export default function binarySearchIndexOf<T>(
  arr: Readonly<T[]>,
  item: T,
  cmpFn: (a: T, b: T) => number,
  left = 0,
  right = arr.length - 1
): BinarySearchIndexOfResult {
  if (right < left) {
    return { index: left, exists: false };
  }
  const mid = Math.floor((right + left) / 2);

  const cmpResult = cmpFn(arr[mid]!, item);
  if (cmpResult < 0) {
    // Mid is smaller
    return binarySearchIndexOf(arr, item, cmpFn, mid + 1, right);
  } else if (cmpResult > 0) {
    // Mid is bigger
    return binarySearchIndexOf(arr, item, cmpFn, left, mid - 1);
  } else {
    return { index: mid, exists: true };
  }
}
