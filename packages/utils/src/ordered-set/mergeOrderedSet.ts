/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { binarySearchIndexOf } from '../array/binarySearchIndexOf';

/**
 * Makes {@link targetSet} union of both {@link targetSet} and {@link insertSet}. \
 * Calls {@link mergeFn} for each equal element according to {@link compareFn}
 * and stores returned value in {@link targetSet}.
 */
export default function mergedOrderedSet<T>(
  targetSet: T[],
  insertSet: readonly T[],
  compareFn: (a: Readonly<T>, b: Readonly<T>) => number,
  mergeFn: (a: Readonly<T>, b: Readonly<T>) => T = (_a, b) => b
) {
  if (insertSet.length === 0) return;

  const leftItem = insertSet[0]!;

  if (insertSet.length === 1) {
    const { index, exists } = binarySearchIndexOf(targetSet, leftItem, compareFn);
    if (exists) {
      targetSet[index] = mergeFn(targetSet[index]!, leftItem);
    } else {
      if (index === targetSet.length) {
        targetSet.push(leftItem);
      } else {
        targetSet.splice(index, 0, leftItem);
      }
    }
    return;
  }

  const { index: leftIndex } = binarySearchIndexOf(targetSet, leftItem, compareFn);
  if (leftIndex === targetSet.length) {
    targetSet.push(...insertSet);
    return;
  }

  const rightItem = insertSet[insertSet.length - 1]!;
  let { index: rightIndex } = binarySearchIndexOf(
    targetSet,
    rightItem,
    compareFn,
    leftIndex
  );

  let i = leftIndex,
    j = 0;
  let consecutiveInsertionMemo: {
    start: number;
    insertStart: number;
  } | null = null;

  function applyConsecutiveInsertion(j: number) {
    if (!consecutiveInsertionMemo) return;

    const { start, insertStart } = consecutiveInsertionMemo;
    if (start === targetSet.length) {
      targetSet.push(...insertSet.slice(insertStart, j));
    } else {
      targetSet.splice(start, 0, ...insertSet.slice(insertStart, j));
    }

    consecutiveInsertionMemo = null;
  }

  while (i <= rightIndex && j < insertSet.length) {
    const targetItem = targetSet[i]!;
    const insertItem = insertSet[j]!;
    const offset = compareFn(targetItem, insertItem);

    // All previous insertions at once
    if (offset <= 0 && consecutiveInsertionMemo) {
      const { insertStart } = consecutiveInsertionMemo;
      const insertLength = j - insertStart;
      i += insertLength;
      rightIndex += insertLength;

      applyConsecutiveInsertion(j);
    }

    if (offset === 0) {
      // Equal => merge
      targetSet[i] = mergeFn(targetItem, insertItem);
      i++;
      j++;
    } else if (offset < 0) {
      // targetItem is smaller, continue
      i++;
    } else {
      // targetItem is bigger, remember consecutive insertion
      if (!consecutiveInsertionMemo) {
        consecutiveInsertionMemo = {
          start: i,
          insertStart: j,
        };
      }
      j++;
    }
  }

  applyConsecutiveInsertion(j);
}
