import { Changeset, RetainStrip } from '../../../common/changeset';
import { Selection } from '../../../common/selection';
import { Service } from '../../service/service';

/**
 * Delete based on current position towards left (Same as pressing backspace on a keyboard).
 * Anything selected is deleted and counts as 1 {@link count}.
 */
export function deletionRecord(
  count = 1,
  completeText: string,
  selection: Selection
): Pick<
  Parameters<Service['addLocalTyping']>[0],
  'changeset' | 'selectionInverse' | 'selection'
> {
  selection = selection.clamp(completeText.length);

  if (selection.start !== selection.end) {
    count--;
  }
  count = Math.max(0, count);

  const deleteSelection = Selection.create(Math.max(selection.start - count, 0), selection.end);

  return {
    changeset: Changeset.create(completeText.length, [
      RetainStrip.create(0, deleteSelection.start),
      RetainStrip.create(deleteSelection.end, completeText.length),
    ]),
    selectionInverse: selection,
    selection: Selection.create(deleteSelection.start),
  };
}
