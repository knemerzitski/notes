import { ChangesetError, InsertStrip, RemoveStrip, RetainStrip, Strip } from '..';
import { Changeset } from '../changeset';

import { parallelWalk } from './parallel-walk';

/**
 * Given:
 * X * A,  X * B \
 * follow(A,B) = B' or f(A,B) \
 *
 * Follow computes a new changeset B' so that X * A * B'.\
 * Intention of B is kept in B':
 * - A inserted characters are retained
 * - B inserted characters are inserted
 * - A and B intersection of retained characters are kept (delete whatever either deleted)
 *
 * Follow is commutative:
 * X * A * f(A,B) = X * B * f(B,A) \
 * This is ensured by using lexicographical ordering for insertions in the same position.
 *
 * Example C is composable on X when A and B are already applied (X * A):
 * X * A * B * f(A,f(B,C)) \
 * @param isA On insertion conflict use {@link A} insertion first
 */
export function follow(A: Changeset, B: Changeset, isA: boolean): Changeset {
  assertIsFollowable(A, B);

  const result: Strip[] = [];

  function isAFirst(stripA: InsertStrip): boolean {
    InsertStrip.setStickyPolicy(stripA, !isA);
    return isA;
  }

  function retainBoth(eitherStrip: RetainStrip, posB: number) {
    // Retain whatever characters are retained in both, position is translated according to B
    result.push(RetainStrip.create(posB, posB + eitherStrip.length));
  }

  function insertBbyRetain(stripB: InsertStrip, posB: number) {
    // Insertions in B become retained characters, position is translated according to B
    result.push(RetainStrip.create(posB, posB + stripB.length));
  }

  function insertA(stripA: InsertStrip) {
    // Insertions in A stay insertions
    result.push(stripA);
  }

  for (const { leftStrip: stripA, rightPos: posB, rightStrip: stripB } of parallelWalk(
    A,
    B
  )) {
    if (RetainStrip.is(stripA) && RetainStrip.is(stripB)) {
      retainBoth(stripB, posB);
    } else if (InsertStrip.is(stripA) && InsertStrip.is(stripB)) {
      if (isAFirst(stripA)) {
        insertA(stripA);
        insertBbyRetain(stripB, posB);
      } else {
        insertBbyRetain(stripB, posB);
        insertA(stripA);
      }
    } else if (InsertStrip.is(stripA)) {
      insertA(stripA);
    } else if (InsertStrip.is(stripB)) {
      insertBbyRetain(stripB, posB);
    } else if (RemoveStrip.is(stripA) || RemoveStrip.is(stripB)) {
      // Anything removed from either will stay removed
    } else {
      throw new Error(
        `Unsupported strip pair. A: ${stripA?.constructor.name}, B: ${stripB?.constructor.name}`
      );
    }
  }

  return Changeset.create(B.outputLength, result);
}

export function isFollowable(A: Changeset, B: Changeset) {
  return A.inputLength === B.inputLength;
}

function assertIsFollowable(A: Changeset, B: Changeset) {
  if (!isFollowable(A, B)) {
    throw new ChangesetError(
      `Changesets are not followable. Input lengths must equal: A${String(A)}, B${String(B)}`
    );
  }
}
