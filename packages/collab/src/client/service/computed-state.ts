import { Changeset } from '../../common/changeset';

import { State, SubmittedServiceRecord, ViewRecord } from './types';
import { emptyState } from './utils/empty-state';

export type ComputedState<S = State> = Omit<MutableComputedState, 'state'> & {
  readonly state: S;
};

/**
 * Cotains common computed methods that are derived from state.
 */
export class MutableComputedState {
  constructor(public state = emptyState) {}

  asImmutable(): ComputedState {
    return this;
  }

  get viewText(): string {
    return this.state.viewText.getText();
  }

  get serverRevision(): number {
    return this.state.serverRevision;
  }

  get localChanges(): Changeset {
    return (
      this.state.localRecord?.changeset ??
      Changeset.identity(this.submittedChanges.outputLength)
    );
  }

  get submittedChanges(): Changeset {
    return (
      this.state.submittedRecord?.changeset ??
      Changeset.identity(this.state.serverText.outputLength)
    );
  }

  get submittedRecord(): SubmittedServiceRecord | null {
    return this.state.submittedRecord;
  }

  get submittedText(): Changeset {
    return Changeset.compose(this.state.serverText, this.submittedChanges);
  }

  get haveLocalChanges(): boolean {
    return !Changeset.isNoOp(this.submittedChanges, this.localChanges);
  }

  get haveSubmittedChanges(): boolean {
    return this.state.submittedRecord != null;
  }

  get haveChanges(): boolean {
    return this.haveSubmittedChanges || this.haveLocalChanges;
  }

  get canSubmitChanges(): boolean {
    return !this.haveSubmittedChanges && this.haveLocalChanges;
  }

  get canUndo(): boolean {
    const firstRecord = this.state.undoStack[this.state.undoStack.length - 1];
    return firstRecord?.type === 'view';
  }

  get canRedo(): boolean {
    return this.state.redoStack.length > 0;
  }

  get historySize() {
    if (this.state.undoStackTypeServerIndexes.length > 0) {
      // History records from server count at most as 1 record in stack
      return (
        this.state.undoStack.length - this.state.undoStackTypeServerIndexes.length + 1
      );
    }

    return this.state.undoStack.length;
  }

  get historyTailServerRevision(): number | undefined {
    const firstUndoRecord = this.state.undoStack[0];
    if (!firstUndoRecord) {
      return;
    }

    if (firstUndoRecord.type !== 'server') {
      return;
    }

    return firstUndoRecord.revision;
  }

  private viewRevisionToIndex(viewRevision: number) {
    const offset = viewRevision - this.state.viewRevision;
    if (offset > 0) {
      return -1;
    }

    const index = this.state.viewChanges.length + offset - 1;
    if (index < 0) {
      return -1;
    }

    return index;
  }

  getViewTextAtRevision(viewRevision: number): Changeset | undefined {
    const startIndex = this.viewRevisionToIndex(viewRevision);
    if (startIndex < 0) {
      return;
    }
    const end = this.state.viewChanges.length;

    return this.state.viewChanges
      .slice(startIndex + 1, end)
      .reduceRight((a, b) => Changeset.compose(a, b.inverse), this.state.viewText);
  }

  getViewChangeAtRevision(viewRevision: number): ViewRecord | undefined {
    return this.state.viewChanges[this.viewRevisionToIndex(viewRevision)];
  }
}
