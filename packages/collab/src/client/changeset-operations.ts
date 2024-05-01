import { Changeset } from '../changeset/changeset';
import { InsertStrip } from '../changeset/insert-strip';
import { RetainStrip } from '../changeset/retain-strip';

export interface ChangesetOperation {
  changeset: Changeset;
  inverseChangeset: Changeset;
  newSelectionPos: number;
}

interface SelectionRange {
  start: number;
  end?: number | null;
}

/**
 * Insert text after selection start position.
 * Anything selected is deleted in returned changeset.
 */
export function insertionOperation(
  insertText: string,
  completeText: string,
  selection?: SelectionRange | null
): ChangesetOperation {
  const selectionStart = selection?.start ?? 0;
  const selectionEnd = selection?.end ?? selectionStart;
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

  const newSelectionPos = selectionStart + insertText.length;

  return {
    changeset: Changeset.from(before, insert, after),
    inverseChangeset: Changeset.from(before, selected, selectedAfter),
    newSelectionPos,
  };
}

/**
 * Delete based on current position towards left (Same as pressing backspace on a keyboard).
 * Anything selected is deleted and counts as 1 {@link count}.
 */
export function deletionCountOperation(
  count = 1,
  completeText: string,
  selection?: SelectionRange | null
): ChangesetOperation | undefined {
  const selectionStart = selection?.start ?? 0;
  const selectionEnd = selection?.end ?? selectionStart;
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

  const newSelectionPos = selectionStart - count;

  return {
    changeset: Changeset.from(before, after),
    inverseChangeset: Changeset.from(before, selected, selectedAfter),
    newSelectionPos,
  };
}
