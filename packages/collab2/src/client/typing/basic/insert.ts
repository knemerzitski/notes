import { Changeset, InsertStrip, RetainStrip } from '../../../common/changeset';
import { Selection } from '../../../common/selection';
import { Service } from '../../service/service';

/**
 * Insert text after selection start position.
 * Anything selected is deleted in returned changeset.
 */
export function insertionRecord(
  insertText: string,
  completeText: string,
  selection: Selection
): Pick<
  Parameters<Service['addLocalTyping']>[0],
  'changeset' | 'selectionInverse' | 'selection'
> {
  selection = selection.clamp(completeText.length);

  return {
    changeset: Changeset.create(completeText.length, [
      RetainStrip.create(0, selection.start),
      InsertStrip.create(insertText),
      RetainStrip.create(selection.end, completeText.length),
    ]),
    selectionInverse: selection,
    selection: Selection.create(selection.start + insertText.length),
  };
}
