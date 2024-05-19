/* eslint-disable @typescript-eslint/no-non-null-assertion */
import binarySearchIndexOf from './binarySearchIndexOf';

interface SmallestMissing<T> {
  before: T;
  last: number;
}

interface SliceConsecutiveArrayResult<T> {
  items: T[];
  missing?: SmallestMissing<T>;
}

/**
 * Slice of consecutive array from items.
 * Smallest possible missing subarray missing from result is returned.
 */
export default function sliceConsecutiveArray<T>(
  arr: T[],
  startItem: T,
  endItemExclusive: T,
  orderFn: (item: T) => number
): SliceConsecutiveArrayResult<T> {
  const size = orderFn(endItemExclusive) - orderFn(startItem);
  if (arr.length === 0 || size === 0) {
    return {
      items: [],
      ...(size > 0
        ? {
            missing: {
              before: endItemExclusive,
              last: size,
            },
          }
        : {}),
    };
  }

  const cmp = (a: T, b: T) => orderFn(a) - orderFn(b);
  const { index: startIndex } = binarySearchIndexOf(arr, startItem, cmp);
  const { index: endIndex } = binarySearchIndexOf(arr, endItemExclusive, cmp);

  if (startIndex === endIndex) {
    return {
      items: [],
      missing: {
        before: endItemExclusive,
        last: size,
      },
    };
  }

  const leftOffset = orderFn(endItemExclusive) - orderFn(arr[startIndex]!);
  const rightOffset = orderFn(arr[endIndex - 1]!) - orderFn(startItem) + 1;
  const rightLast = size - rightOffset;
  const leftLast = size - leftOffset;
  let outMissing: SmallestMissing<T> | undefined;
  if (leftLast > 0 && rightLast > 0) {
    return {
      items: arr.slice(startIndex, endIndex),
      missing: {
        before: endItemExclusive,
        last: size,
      },
    };
  } else if (leftLast > 0) {
    outMissing = {
      before: arr[Math.max(0, endIndex - leftOffset)]!,
      last: leftLast,
    };
  } else if (rightLast > 0) {
    outMissing = {
      before: endItemExclusive,
      last: rightLast,
    };
  }

  const inBeforeAfter = findSmallestSubArrayWithGaps(
    arr,
    startIndex,
    endIndex - 1,
    orderFn
  );
  const inMissing: SmallestMissing<T> | undefined = inBeforeAfter
    ? {
        before: inBeforeAfter.before,
        last: orderFn(inBeforeAfter.before) - orderFn(inBeforeAfter.after) - 1,
      }
    : undefined;
  const unionMissing = getUnionMissing(inMissing, outMissing, orderFn);
  return {
    items: arr.slice(startIndex, endIndex),
    ...(unionMissing
      ? {
          missing: unionMissing,
        }
      : {}),
  };
}

interface BeforeAfter<T> {
  after: T;
  before: T;
}

/**
 * Smallest subarray that contains all elements with gaps
 */
function findSmallestSubArrayWithGaps<T>(
  arr: T[],
  left: number,
  right: number,
  orderFn: (item: T) => number
): BeforeAfter<T> | undefined {
  if (right <= left) return;

  const partSize = right - left + 1;
  const fullSize = orderFn(arr[right]!) - orderFn(arr[left]!) + 1;
  if (partSize === fullSize) {
    return;
  } else if (fullSize === 3 && partSize === 2) {
    return {
      after: arr[left]!,
      before: arr[right]!,
    };
  }

  const mid = Math.floor((left + right) / 2);
  const leftSmallest = findSmallestSubArrayWithGaps(arr, left, mid, orderFn);
  const rightSmallest = findSmallestSubArrayWithGaps(arr, mid, right, orderFn);
  if (leftSmallest && rightSmallest) {
    return {
      after: leftSmallest.after,
      before: rightSmallest.before,
    };
  } else if (leftSmallest) {
    return leftSmallest;
  } else if (rightSmallest) {
    return rightSmallest;
  }

  return;
}

function getUnionMissing<T>(
  a: SmallestMissing<T> | undefined,
  b: SmallestMissing<T> | undefined,
  order: (item: T) => number
): SmallestMissing<T> | undefined {
  if (a && b) {
    const [left, right] = order(a.before) < order(b.before) ? [a, b] : [b, a];
    return {
      before: right.before,
      last: order(right.before) - order(left.before) + left.last,
    };
  } else if (a) {
    return a;
  }

  return b;
}
