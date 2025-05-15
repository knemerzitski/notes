import { Changeset, ChangesetError, InsertStrip, RangeStrip, Strip } from '..';

interface YieldResult {
  /**
   * Current position in changeset A
   */
  readonly leftPos: number;
  /**
   * Current position in changeset B
   */
  readonly rightPos: number;
  readonly leftStrip: Strip | undefined;
  readonly rightStrip: Strip | undefined;
}

/**
 * Both changesets must apply to same text.
 * Walk changesets in parallel yielding strips on the same position.
 */
export function* parallelWalk(
  leftChangeset: Changeset,
  rightChangeset: Changeset
): Generator<YieldResult> {
  assertIsParallelWalkable(leftChangeset, rightChangeset);

  const leftStrips = [...leftChangeset.strips].reverse();
  const rightStrips = [...rightChangeset.strips].reverse();

  let leftPos = 0;
  let rightPos = 0;
  while (leftStrips.length > 0 || rightStrips.length > 0) {
    const leftStrip = leftStrips[leftStrips.length - 1];
    const rightStrip = rightStrips[rightStrips.length - 1];

    if (RangeStrip.is(leftStrip) && RangeStrip.is(rightStrip)) {
      leftStrips.pop();
      rightStrips.pop();

      const intersectLen = Math.min(leftStrip.length, rightStrip.length);

      const leftRemainder = leftStrip.slice(intersectLen);
      if (!leftRemainder.isEmpty()) {
        leftStrips.push(leftRemainder);
      }

      const rightRemainder = rightStrip.slice(intersectLen);
      if (!rightRemainder.isEmpty()) {
        rightStrips.push(rightRemainder);
      }

      yield {
        leftPos,
        rightPos,
        leftStrip: leftStrip.slice(0, intersectLen),
        rightStrip: rightStrip.slice(0, intersectLen),
      };

      leftPos += Math.min(leftStrip.outputLength, intersectLen);
      rightPos += Math.min(rightStrip.outputLength, intersectLen);
    } else if (InsertStrip.is(leftStrip) && InsertStrip.is(rightStrip)) {
      leftStrips.pop();
      rightStrips.pop();

      yield {
        leftPos,
        rightPos,
        leftStrip,
        rightStrip,
      };

      leftPos += leftStrip.outputLength;
      rightPos += rightStrip.outputLength;
    } else if (InsertStrip.is(leftStrip)) {
      leftStrips.pop();

      yield {
        leftPos,
        rightPos,
        leftStrip,
        rightStrip,
      };

      leftPos += leftStrip.outputLength;
    } else if (InsertStrip.is(rightStrip)) {
      rightStrips.pop();

      yield {
        leftPos,
        rightPos,
        leftStrip,
        rightStrip,
      };

      rightPos += rightStrip.outputLength;
    } else {
      throw new Error(
        `Unsupported strips. Left: ${leftStrip?.constructor.name}, Right: ${rightStrip?.constructor.name}`
      );
    }
  }
}

function isParallelWalkable(A: Changeset, B: Changeset) {
  return A.inputLength === B.inputLength;
}

function assertIsParallelWalkable(A: Changeset, B: Changeset) {
  if (!isParallelWalkable(A, B)) {
    throw new ChangesetError(
      `Changesets are not parallel walkable. Input lengths must equal: A${String(A)}, B${String(B)}`
    );
  }
}
