import { RetainStrip, Changeset } from '../../../changeset';
import { SelectionRange } from '../../selection-range';
import { SelectionChangeset } from '../../types';

/**
 * Delete based on current position towards left (Same as pressing backspace on a keyboard).
 * Anything selected is deleted and counts as 1 {@link count}.
 */
export function deleteCountToSelectionChangeset(
  count = 1,
  completeText: string,
  selection: Readonly<SelectionRange>
): SelectionChangeset {
  selection = SelectionRange.clamp(selection, completeText.length);

  count = Math.max(0, count);
  if (selection.start !== selection.end) {
    count--;
  }

  count = Math.min(selection.start, count);

  const before = RetainStrip.create(0, selection.start - count - 1);
  const after = RetainStrip.create(selection.end, completeText.length - 1);

  return {
    changeset: Changeset.from(before, after),
    afterSelection: SelectionRange.from(selection.start - count),
    beforeSelection: selection,
  };
}
