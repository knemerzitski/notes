import { Changeset } from '../../changeset';
import { InsertStrip } from '../../insert-strip';
import { RetainStrip } from '../../retain-strip';

export interface RevisionChangeset {
  revision: number;
  changeset: Changeset;
}

interface LocalCommand {
  execute(): void;
  undo(): void;
  update(changeset: Changeset): void;
}

// TODO Rename to Editor based on Changesets
export class Document {
  protected revision = 0;

  protected latestServerChanges = Changeset.EMPTY;
  protected submittedChanges = Changeset.EMPTY;
  protected localChanges = Changeset.EMPTY;
  protected composedViewChangeset = Changeset.EMPTY;

  private commandHistory: LocalCommand[] = [];
  private lastExecutedCommandIndex = -1;

  private _value = '';

  get value() {
    return this._value;
  }

  private _startCursorPos = 0;

  get startCursorPos() {
    return this._startCursorPos;
  }

  private _endCursorPos = 0;

  get endCursorPos() {
    return this._endCursorPos;
  }

  private refreshComposedView() {
    this.composedViewChangeset = this.latestServerChanges
      .compose(this.submittedChanges)
      .compose(this.localChanges);
  }

  private updateValueFromComposedView() {
    this._value = this.composedViewChangeset.strips.values
      .map((strip) => (strip instanceof InsertStrip ? strip.value : ''))
      .join('');
  }

  private newLocalTyping(localChangeModification: Changeset) {
    const newLocalChanges = this.localChanges.compose(localChangeModification);
    this.localChanges = newLocalChanges;
    this.refreshComposedView();
    this.updateValueFromComposedView();
  }

  /**
   * Accept server changeset that replaces current value.
   */
  handleServerLatestVersion({ revision, changeset }: RevisionChangeset) {
    this.revision = revision;

    this.latestServerChanges = changeset;
    this.submittedChanges = changeset.getIdentity();
    this.localChanges = changeset.getIdentity();
    this.composedViewChangeset = changeset;
    this.refreshComposedView();
    this.updateValueFromComposedView();
  }

  /**
   * This method cannot be called again until changes have been
   * acknowledged: {@link handleSubmittedChangesAcknowledged}.
   * @returns Changeset meant to be sent to server.
   */
  readyChangesForServerSubmission() {
    if (!this.submittedChanges.isIdentity(this.latestServerChanges)) {
      throw new Error(
        `Cannot getChangesetForServerSubmission as previous changeset has not been acknowledged: ${String(
          this.submittedChanges
        )}`
      );
    }

    const submitChangeset: RevisionChangeset = {
      revision: this.revision,
      changeset: this.localChanges,
    };

    this.submittedChanges = this.localChanges;
    this.localChanges = this.composedViewChangeset.getIdentity();

    return submitChangeset;
  }

  /**
   * Server has processed changes and document is now up to date.
   */
  handleSubmittedChangesAcknowledged(revision: number) {
    if (this.revision + 1 !== revision) {
      throw new Error(
        `Unable to handle changes acknowledgement. Missing previous revisions. Acknowlegement revision: ${revision}. Current revision ${this.revision}`
      );
    }
    this.latestServerChanges = this.latestServerChanges.compose(this.submittedChanges);
    this.submittedChanges = this.composedViewChangeset.getIdentity();
    this.revision = revision;
  }

  /**
   * Processes changes from other clients.
   */
  handleOtherClientChanges({ revision, changeset: otherChanges }: RevisionChangeset) {
    if (this.revision + 1 !== revision) {
      throw new Error(
        `Unable to handle other client changes. Missing previous revisions. Other client revision: ${revision}. Current revision ${this.revision}`
      );
    }

    const newLatestServerChangeset = this.latestServerChanges.compose(otherChanges);
    const newSubmittedChangeset = otherChanges.follow(this.submittedChanges);

    const submittedFollowOther = this.submittedChanges.follow(otherChanges);
    const newLocalChangeset = submittedFollowOther.follow(this.localChanges);
    this.commandHistory.forEach((command) => {
      command.update(submittedFollowOther);
    });
    const viewComposableChangeset = this.localChanges.follow(submittedFollowOther);

    const newCurrentViewChangeset = this.composedViewChangeset.compose(
      viewComposableChangeset
    );

    this.latestServerChanges = newLatestServerChangeset;
    this.submittedChanges = newSubmittedChangeset;
    this.localChanges = newLocalChangeset;
    this.composedViewChangeset = newCurrentViewChangeset;

    this.revision = revision;

    this.updateValueFromComposedView();

    const newStartCursorPos = viewComposableChangeset.followPosition(
      this._startCursorPos
    );

    const cursorOffset = newStartCursorPos - this._startCursorPos;
    this.offsetSelection(cursorOffset);
  }

  undo() {
    const currentCommand = this.commandHistory[this.lastExecutedCommandIndex];
    if (currentCommand) {
      currentCommand.undo();
      this.lastExecutedCommandIndex--;
    } else {
      throw new Error('Nothing to undo!');
    }
  }

  redo() {
    const nextCommand = this.commandHistory[this.lastExecutedCommandIndex + 1];
    if (nextCommand) {
      nextCommand.execute();
      this.lastExecutedCommandIndex++;
    } else {
      throw new Error('Nothing to redo!');
    }
  }

  /**
   * @param text Inserts text at current cursor position. Anything already
   * selected is deleted.
   */
  type(text: string) {
    const before = RetainStrip.create(0, this._startCursorPos - 1);
    const insert = new InsertStrip(text);
    const after = RetainStrip.create(this._endCursorPos, this.value.length - 1);
    const afterOffset = RetainStrip.create(
      this._endCursorPos + text.length,
      this.value.length - 1 + text.length
    );

    let cursorPos = this._startCursorPos + text.length;
    let change = Changeset.from(before, insert, after);
    let undoChange = Changeset.from(before, afterOffset);
    const command: LocalCommand = {
      execute: () => {
        this._startCursorPos = cursorPos;
        this._endCursorPos = cursorPos;
        this.newLocalTyping(change);
      },
      undo: () => {
        this._startCursorPos = cursorPos - text.length;
        this._endCursorPos = cursorPos - text.length;
        this.newLocalTyping(undoChange);
      },
      update: (externalChange) => {
        cursorPos = externalChange.followPosition(cursorPos);
        change = externalChange.follow(change);
        undoChange = externalChange.follow(undoChange);
      },
    };

    if (this.lastExecutedCommandIndex < this.commandHistory.length - 1) {
      this.commandHistory = this.commandHistory.slice(
        0,
        this.lastExecutedCommandIndex + 1
      );
    }
    this.commandHistory.push(command);
    this.lastExecutedCommandIndex++;
    command.execute();
  }

  /**
   * Deletes text from current cursor position towards
   * the left side.
   * @param count
   * @returns
   */
  backspace(count = 1) {
    if (count <= 0) return;
    if (this._startCursorPos !== this._endCursorPos) {
      count--;
    }
    count = Math.min(this._startCursorPos, count);
    const before = RetainStrip.create(0, this._startCursorPos - count - 1);
    const after = RetainStrip.create(this._endCursorPos, this.value.length - 1);
    const deleted = InsertStrip.create(
      this.value.substring(this._startCursorPos - count, this._endCursorPos)
    );
    const afterOffset = RetainStrip.create(
      this._startCursorPos - count,
      this.value.length - count - 1
    );

    this._startCursorPos -= count;
    this._endCursorPos = this._startCursorPos;

    let change = Changeset.from(before, after);
    let undoChange = Changeset.from(before, deleted, afterOffset);
    const command: LocalCommand = {
      execute: () => {
        this.newLocalTyping(change);
      },
      undo: () => {
        this.newLocalTyping(undoChange);
      },
      update: (externalChange) => {
        change = externalChange.follow(change);
        undoChange = externalChange.follow(undoChange);
      },
    };

    if (this.lastExecutedCommandIndex < this.commandHistory.length - 1) {
      this.commandHistory = this.commandHistory.slice(
        0,
        this.lastExecutedCommandIndex + 1
      );
    }
    this.commandHistory.push(command);
    this.lastExecutedCommandIndex++;
    command.execute();
  }

  setSelection(start: number, end: number) {
    if (end < start) {
      [start, end] = [end, start];
    }
    if (start < 0) {
      start = (start % this.value.length) + this.value.length + 1;
    }
    if (end < 0) {
      end = (end % this.value.length) + this.value.length + 1;
    }

    start = Math.min(this.value.length, start);
    end = Math.min(this.value.length, end);

    this._startCursorPos = start;
    this._endCursorPos = end;
  }

  offsetSelection(offset: number) {
    if (offset === 0) return;

    this.setSelection(this._startCursorPos + offset, this._endCursorPos + offset);
  }

  selectAll() {
    this.setSelection(0, this.value.length);
  }

  setCursor(pos = 0) {
    this.setSelection(pos, pos);
  }
}
