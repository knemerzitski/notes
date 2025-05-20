import { Changeset } from '../changeset';
import { Selection } from '../selection';

interface ChangesetSelection {
  readonly changeset: Changeset;
  readonly inverse: Changeset;
  readonly selection: Selection;
  readonly selectionInverse: Selection;
}

/**
 * Follow changeset with selection
 *
 * @param isA On insertion conflict use A insertion first
 * @param textB Text when B is composed
 */
export function followChangesetSelection(
  A: ChangesetSelection,
  B: Changeset,
  textB: Changeset | string,
  isA: boolean
): ChangesetSelection {
  const B_A = Changeset.follow(A.changeset, B, isA);
  const inverse = Changeset.inverse(B_A, textB);

  const A_B = Changeset.follow(B, A.changeset, !isA);
  const selection = A.selection.follow(A_B, isA);

  // Using follow only to calculate correct bias for selection
  Changeset.follow(A_B, A.inverse, isA); // A_iA_B
  const selectionInverse = A.selectionInverse.follow(B, isA);

  return {
    changeset: B_A,
    inverse,
    selectionInverse,
    selection,
  };
}
