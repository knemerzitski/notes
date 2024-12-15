import { getStripLengthIncludeDeletion } from './strip-length';
import { twoStripsParallelIterable } from './strips-iterable';

import { Changeset, DeleteStrip, InsertStrip, RetainStrip, Strip } from '.';

/**
 * Given changesets composition A * X * Y. \
 * Return new changesets [ Y', X' ] so that A * Y' * X' = A * X * Y (composed final text is same) \
 * - Y': changeset has intention of Y (keeps same insertions and deletions)
 * - X': changeset has intention of X
 */
export function swapChangesets(
  A_length: number,
  inX: Changeset,
  InY: Changeset
): [Changeset, Changeset] {
  if (InY.length === 0) {
    return [Changeset.EMPTY, Changeset.EMPTY];
  }

  const X = inX.stripsWithDeleteStrips(A_length);
  const Y = InY.stripsWithDeleteStrips(inX.length);

  const Y_: Strip[] = [];
  const X_: Strip[] = [];
  let Y_index = 0;

  for (const [
    { strip: x, next: xNext },
    { strip: y, next: yNext },
  ] of twoStripsParallelIterable(X, Y, {
    getLength: getStripLengthIncludeDeletion,
  })) {
    if (x instanceof DeleteStrip) {
      // Delete X => Retain Y', Delete X'
      Y_.push(x.toRetainStrip());
      // X_.push(DeleteStrip.create(Y_index, Y_index + x.deleteLength - 1));
      Y_index += x.deleteLength;
      xNext();
    } else if (x instanceof RetainStrip) {
      if (y instanceof DeleteStrip) {
        // Retain X, Delete Y => Delete Y'
        Y_.push(x.toDeleteStrip());
        xNext();
      } else if (y instanceof RetainStrip) {
        // Retain X, retain Y => retain Y'
        Y_.push(x);
        X_.push(RetainStrip.create(Y_index, Y_index + x.length - 1));
        Y_index += x.length;
        xNext();
      } else if (y instanceof InsertStrip) {
        // Retain X, Insert Y => Insert Y', Retain X'
        Y_.push(y);
        X_.push(RetainStrip.create(Y_index, Y_index + y.length - 1));
        Y_index += y.length;
      }

      yNext();
    } else if (x instanceof InsertStrip) {
      if (y instanceof DeleteStrip) {
        // Insert X, Delete Y => Destructive delete Y'
        xNext();
      } else if (y instanceof RetainStrip) {
        // Insert X, Retain Y => Empty Y', Insert X'
        X_.push(x);
        xNext();
      } else if (y instanceof InsertStrip) {
        // Insert X, Insert Y => Insert Y in Y', Retain X'
        Y_.push(y);
        X_.push(RetainStrip.create(Y_index, Y_index + y.length - 1));
        Y_index += y.length;
      }

      yNext();
    } else if (x === undefined) {
      if (y instanceof InsertStrip) {
        // Insert Y => Insert Y', Retain X'
        Y_.push(y);
        X_.push(RetainStrip.create(Y_index, Y_index + y.length - 1));
        Y_index += y.length;
      }
      yNext();
    }
  }

  return [new Changeset(Y_), new Changeset(X_)];
}
