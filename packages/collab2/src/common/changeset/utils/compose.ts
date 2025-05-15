import { ChangesetError } from '..';
import { Changeset } from '../changeset';

/**
 * Composition between changeset A(x->y) and B(y->z) is denoted as A * B(x->z)
 * @returns A new changeset that is a compostion of A and B.
 * E.g. ["hello"] * [0-4, " world"] = ["hello world"]
 */
export function compose(A: Changeset, B: Changeset): Changeset {
  assertIsComposable(A, B);

  if (B.isEmpty()) {
    return Changeset.EMPTY;
  }

  return Changeset.create(
    A.inputLength,
    B.strips.flatMap((strip) => strip.reference(A))
  );
}

export function isComposable(A: Changeset | string, B: Changeset): boolean {
  return getLength(A) === B.inputLength;
}

function getLength(value: Changeset | string) {
  return Changeset.is(value) ? value.outputLength : value.length;
}

export function assertIsComposable(A: Changeset, B: Changeset) {
  if (!isComposable(A, B)) {
    throw new ChangesetError(
      `Changesets are not composable. A.outputLength must equal B.inputLength: A${String(A)} * B${String(B)}`
    );
  }
}
