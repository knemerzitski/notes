import mitt, { Emitter } from 'mitt';

import { Changeset } from '../changeset';
import { InsertStrip } from '../insert-strip';
import { RetainStrip } from '../retain-strip';

import { SelectionRange } from './selection-range';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Events = {
  change: {
    /**
     * Changeset containing all new changes.
     */
    changeset: Changeset;
    /**
     * Inverse of changeset that can be composed after changeset to revert the changes.
     */
    inverseChangeset: Changeset;
    /**
     * New selection position after change.
     */
    selectionPos: number;
  };
};

export interface ChangesetEditorProps {
  /**
   * Changeset changes are based on this value.
   */
  getValue(): string;

  /**
   * Defines where to make changes in value.
   */
  readonly selection: SelectionRange;

  /**
   * @param changes.changeset Changeset containing all new changes.
   * @param changes.inverseChangeset Inverse of changeset that can be composed after
   * changeset to revert the changes.
   * @param changes.selectionPos New selection position after change.
   */

  eventBus?: Emitter<Events>;
}

/**
 * A selection range based changeset editor.
 */
export class ChangesetEditor {
  readonly eventBus;

  private props: ChangesetEditorProps;

  private get value() {
    return this.props.getValue();
  }

  constructor(props: ChangesetEditorProps) {
    this.props = props;
    this.eventBus = props.eventBus ?? mitt<Events>();
  }

  /**
   * Insert text after caret position.
   * Anything selected is deleted.
   */
  insert(insertText: string) {
    const selectionStart = this.props.selection.start;
    const selectionEnd = this.props.selection.end;
    const textValue = this.value;
    const totalLength = this.value.length;

    const selectionLength = selectionEnd - selectionStart;
    const lengthChange = insertText.length - selectionLength;

    const before = RetainStrip.create(0, selectionStart - 1);
    const insert = InsertStrip.create(insertText);
    const after = RetainStrip.create(selectionEnd, totalLength - 1);

    const selected = InsertStrip.create(
      textValue.substring(selectionStart, selectionEnd)
    );
    const selectedAfter = RetainStrip.create(
      selectionEnd + lengthChange,
      textValue.length + lengthChange - 1
    );

    const newSelectionPos = selectionStart + insertText.length;

    this.eventBus.emit('change', {
      changeset: Changeset.from(before, insert, after),
      inverseChangeset: Changeset.from(before, selected, selectedAfter),
      selectionPos: newSelectionPos,
    });
  }

  /**
   * Delete based on current caret position towards left (Same as pressing backspace on a keyboard).
   * Anything selected is deleted and counts as 1 {@link count}.
   */
  deleteCount(count = 1) {
    const selectionStart = this.props.selection.start;
    const selectionEnd = this.props.selection.end;
    const textValue = this.value;
    const totalLength = this.value.length;

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

    this.eventBus.emit('change', {
      changeset: Changeset.from(before, after),
      inverseChangeset: Changeset.from(before, selected, selectedAfter),
      selectionPos: newSelectionPos,
    });
  }
}
