/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * @returns Index of item in set or -1 if not found.
 */
export function consecutiveOrderedSetIndexOf<T>(
  set: readonly T[],
  rank: number,
  rankFn: (item: T) => number
) {
  if (!isConsecutiveOrderedSet(set, (a, b) => rankFn(a) - rankFn(b))) {
    throw new Error(
      'Expected an array with consecutive elements. Cannot index non-consecutive array'
    );
  }
  const lastItem = set[set.length - 1];
  if (!lastItem) return -1;

  const result = rank + (set.length - rankFn(lastItem)) - 1;
  if (result < 0 || result >= set.length) return -1;

  return result;
}

/**
 * Doesn't check every element, only boundaries.
 * @returns True if array seems to be sorted and has no duplicate elements.
 */
export function isConsecutiveOrderedSet<T>(
  set: readonly T[],
  compareFn: (a: T, b: T) => number
) {
  return isConsecutive(set, 0, set.length, compareFn);
}

function isConsecutive<T>(
  set: readonly T[],
  start: number,
  end: number,
  compareFn: (a: T, b: T) => number
) {
  if (end - start <= 1) return true;

  const firstItem = set[start];
  if (!firstItem) return true;
  const lastItem = set[end - 1];
  if (!lastItem) return true;
  if (firstItem === lastItem) return true;

  return compareFn(lastItem, firstItem) === end - start - 1;
}

interface Range {
  start: number;
  end: number;
}

/**
 * Finds a consecutive subset by adjusting start or end based on lookup.
 */
export function binarySearchConsecutiveOrderedSubset<T>(
  set: T[],
  rankFn: (item: T) => number,
  lookup: 'start' | 'end' = 'end',
  start = 0,
  end = set.length
): Range {
  if (end - start <= 0) {
    return { start, end: start };
  }
  if (end - start === 1) {
    return {
      start,
      end,
    };
  }

  const left = start;
  const right = end - 1;
  const rankLeft = rankFn(set[left]!);
  const rankRight = rankFn(set[right]!);
  const count = right - left + 1;
  const expectedCount = rankRight - rankLeft + 1;
  if (count === expectedCount) {
    return {
      start,
      end,
    };
  }

  const mid = Math.floor((left + right) / 2);
  const [leftMid, rightMid] = (right - left + 1) % 2 == 0 ? [mid, mid + 1] : [mid, mid];
  let anchor: Range = {
    start: left,
    end: leftMid + 1,
  };
  let offset: Range = {
    start: rightMid,
    end: right + 1,
  };
  if (lookup === 'start') {
    [anchor, offset] = [offset, anchor];
  }

  const anchorSubset = binarySearchConsecutiveOrderedSubset(
    set,
    rankFn,
    lookup,
    anchor.start,
    anchor.end
  );
  const isAnchorSubsetComplete =
    anchorSubset.end - anchorSubset.start === anchor.end - anchor.start;
  if (!isAnchorSubsetComplete) {
    return anchorSubset;
  }

  if (leftMid !== rightMid) {
    const leftMidRank = rankFn(set[leftMid]!);
    const rightMidRank = rankFn(set[rightMid]!);
    if (rightMidRank - leftMidRank !== 1) {
      return anchorSubset;
    }
  }

  const offsetSubset = binarySearchConsecutiveOrderedSubset(
    set,
    rankFn,
    lookup,
    offset.start,
    offset.end
  );

  if (lookup === 'start') {
    return {
      start: offsetSubset.start,
      end: anchorSubset.end,
    };
  } else {
    return {
      start: anchorSubset.start,
      end: offsetSubset.end,
    };
  }
}
