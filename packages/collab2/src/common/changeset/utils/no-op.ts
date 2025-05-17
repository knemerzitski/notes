import { Changeset, InsertStrip, RangeStrip, RemoveStrip, RetainStrip, Strip } from '..';

import { compose, isComposable } from './compose';

/**
 * @returns `true` when composing {@link left} and {@link right} results {@link left} or results {@link right} when {@link noOpLeft} is `true`
 */
export function isNoOp(left: Changeset, right: Changeset, noOpLeft = false): boolean {
  if (!isComposable(left, right)) {
    return false;
  }

  if (noOpLeft) {
    if (left.isIdentity()) {
      return true;
    }
  } else {
    if (right.isIdentity()) {
      return true;
    }
  }

  return compose(left, right).isEqual(noOpLeft ? right : left);
}

/**
 * @returns Changeset that has no-ops removed
 */
export function removeNoOps(changeset: Changeset, text: string): Changeset {
  if (!isComposable(text, changeset)) {
    return changeset;
  }

  if (text.length === 0) {
    return changeset;
  }

  const result: Strip[] = [];

  let pos = 0;
  for (let i = 0; i < changeset.strips.length; i++) {
    const strip = changeset.strips[i];
    const nextStrip = changeset.strips[i + 1];

    let pushStrip = strip;
    if (strip && nextStrip) {
      if (InsertStrip.is(strip) && RemoveStrip.is(nextStrip)) {
        const removedText = text.slice(nextStrip.start, nextStrip.end);

        if (removedText === strip.value) {
          // When removed text equals inserted text then replace it with retained characters
          pushStrip = RetainStrip.create(pos, pos + strip.length);
        }
      }
    }

    if (pushStrip && pushStrip.outputLength > 0) {
      result.push(pushStrip);
    }

    if (RangeStrip.is(strip)) {
      pos += strip.length;
    }
  }

  return Changeset.create(changeset.inputLength, result);
}
