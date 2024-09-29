import { RetainStrip, InsertStrip, Changeset } from '../../../changeset';
import { SelectionRange } from '../../selection-range';
import { SelectionChangeset } from '../../types';

/**
 * Insert text after selection start position.
 * Anything selected is deleted in returned changeset.
 */
export function insertToSelectionChangeset(
  insertText: string,
  completeText: string,
  selection: Readonly<SelectionRange>
): SelectionChangeset {
  selection = SelectionRange.clamp(selection, completeText.length);

  const before = RetainStrip.create(0, selection.start - 1);
  const insert = InsertStrip.create(insertText);
  const after = RetainStrip.create(selection.end, completeText.length - 1);

  return {
    changeset: Changeset.from(before, insert, after),
    afterSelection: SelectionRange.from(selection.start + insertText.length),
    beforeSelection: selection,
  };
}
