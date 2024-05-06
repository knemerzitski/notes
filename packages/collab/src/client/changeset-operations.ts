import { Changeset } from '../changeset/changeset';
import { InsertStrip } from '../changeset/insert-strip';
import { RetainStrip } from '../changeset/retain-strip';
import { SelectionRange } from './selection-range';

export interface ChangesetOperation {
  changeset: Changeset;
  inverseChangeset: Changeset;
  selection: SelectionRange;
  inverseSelection: SelectionRange;
}

/**
 * Insert text after selection start position.
 * Anything selected is deleted in returned changeset.
 */
export function insertionOperation(
  insertText: string,
  completeText: string,
  selection: Readonly<SelectionRange>
): ChangesetOperation {
  selection = SelectionRange.clamp(selection, completeText.length);
  const selectionStart = selection.start;
  const selectionEnd = selection.end;
  const textValue = completeText;
  const totalLength = completeText.length;

  const selectionLength = selectionEnd - selectionStart;
  const lengthChange = insertText.length - selectionLength;

  const before = RetainStrip.create(0, selectionStart - 1);
  const insert = InsertStrip.create(insertText);
  const after = RetainStrip.create(selectionEnd, totalLength - 1);

  const selected = InsertStrip.create(textValue.substring(selectionStart, selectionEnd));
  const selectedAfter = RetainStrip.create(
    selectionEnd + lengthChange,
    textValue.length + lengthChange - 1
  );

  return {
    changeset: Changeset.from(before, insert, after),
    inverseChangeset: Changeset.from(before, selected, selectedAfter),
    selection: SelectionRange.from(selectionStart + insertText.length),
    inverseSelection: selection,
  };
}

/**
 * Delete based on current position towards left (Same as pressing backspace on a keyboard).
 * Anything selected is deleted and counts as 1 {@link count}.
 */
export function deletionCountOperation(
  count = 1,
  completeText: string,
  selection: Readonly<SelectionRange>
): ChangesetOperation | undefined {
  selection = SelectionRange.clamp(selection, completeText.length);
  const selectionStart = selection.start;
  const selectionEnd = selection.end;
  const textValue = completeText;
  const totalLength = completeText.length;

  if (count <= 0) return;
  if (selectionStart !== selectionEnd) {
    count--;
  }
  count = Math.min(selectionStart, count);
  const selectionLen = selectionEnd - selectionStart;
  const lenChange = -(selectionLen + count);

  const before = RetainStrip.create(0, selectionStart - count - 1);
  const after = RetainStrip.create(selectionEnd, totalLength - 1);

  const selected = InsertStrip.create(
    textValue.substring(selectionStart - count, selectionEnd)
  );
  const selectedAfter = RetainStrip.create(
    selectionStart - count,
    totalLength + lenChange - 1
  );

  return {
    changeset: Changeset.from(before, after),
    inverseChangeset: Changeset.from(before, selected, selectedAfter),
    selection: SelectionRange.from(selectionStart - count),
    inverseSelection: selection,
  };
}
