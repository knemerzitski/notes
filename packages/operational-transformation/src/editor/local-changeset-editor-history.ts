import { Emitter } from 'mitt';

import { Changeset } from '../changeset';
import {
  DocumentClient,
  Events as DocumentClientEvents,
} from '../client/document-client';

import { Events as ChangesetEditorEvents } from './changeset-editor';
import { SelectionDirection, SelectionRange } from './selection-range';

interface LocalChangesetEditorHistoryProps {
  selection: SelectionRange;
  editorBus: Emitter<Pick<ChangesetEditorEvents, 'change'>>;
  document: DocumentClient;
}

interface TypingOperation {
  changeset: Changeset;
  selectionDirection: SelectionDirection;
  selectionStart: number;
  selectionEnd: number;
}

interface HistoryEntry {
  execute: TypingOperation;
  undo: TypingOperation;
}

/**
 * Maintains a history of {@link DocumentClient.local} changeset and {@link SelectionRange} state.
 * External changes alter history as if change has always been there.
 */
export class LocalChangesetEditorHistory {
  private props: LocalChangesetEditorHistoryProps;

  private entries: HistoryEntry[] = [];

  get entryCount() {
    return this.entries.length;
  }

  private lastExecutedIndex = {
    server: -1,
    submitted: -1,
    local: -1,
  };

  private serverBaseComposition = Changeset.EMPTY;

  private unsubscribeFromEvents: () => void;

  constructor(props: LocalChangesetEditorHistoryProps) {
    this.props = props;
    const { selection, editorBus: editorBus, document } = props;

    const editorChangeListener = ({
      changeset,
      inverseChangeset,
      selectionPos,
    }: ChangesetEditorEvents['change']) => {
      const newEntry: HistoryEntry = {
        execute: {
          changeset,
          selectionDirection: SelectionDirection.Forward,
          selectionStart: selectionPos,
          selectionEnd: selectionPos,
        },
        undo: {
          changeset: inverseChangeset,
          selectionDirection: selection.direction,
          selectionStart: selection.start,
          selectionEnd: selection.end,
        },
      };

      this.push(newEntry);
    };

    const submitChangesListener = () => {
      this.lastExecutedIndex.submitted = this.lastExecutedIndex.local;
    };

    const submittedChangesAcknowledgedListener = () => {
      this.lastExecutedIndex.server = this.lastExecutedIndex.submitted;
    };

    const handleExternalChangeListener = ({
      externalChange,
    }: DocumentClientEvents['handleExternalChange']) => {
      this.updateHistoryFromExternalChange(externalChange);
    };

    editorBus.on('change', editorChangeListener);
    document.eventBus.on('submitChanges', submitChangesListener);
    document.eventBus.on(
      'submittedChangesAcknowledged',
      submittedChangesAcknowledgedListener
    );
    document.eventBus.on('handleExternalChange', handleExternalChangeListener);

    this.unsubscribeFromEvents = () => {
      editorBus.off('change', editorChangeListener);
      document.eventBus.off('submitChanges', submitChangesListener);
      document.eventBus.off(
        'submittedChangesAcknowledged',
        submittedChangesAcknowledgedListener
      );
      document.eventBus.off('handleExternalChange', handleExternalChangeListener);
    };
  }

  /**
   * Removes event listeners. This instance becomes useless.
   */
  cleanUp() {
    this.unsubscribeFromEvents();
  }

  private push(entry: HistoryEntry) {
    if (this.lastExecutedIndex.local < this.entries.length - 1) {
      this.entries = this.entries.slice(0, this.lastExecutedIndex.local + 1);

      this.lastExecutedIndex.submitted = Math.min(
        this.lastExecutedIndex.submitted,
        this.lastExecutedIndex.local
      );
      this.lastExecutedIndex.server = Math.min(
        this.lastExecutedIndex.server,
        this.lastExecutedIndex.submitted
      );
    }

    this.entries.push(entry);
    this.lastExecutedIndex.local++;
    this.applyTypingOperation(entry.execute);
  }

  undo() {
    const entry = this.entries[this.lastExecutedIndex.local];
    if (entry) {
      this.applyTypingOperation(entry.undo);
      this.lastExecutedIndex.local--;
    }
  }

  redo() {
    const entry = this.entries[this.lastExecutedIndex.local + 1];
    if (entry) {
      this.applyTypingOperation(entry.execute);
      this.lastExecutedIndex.local++;
    }
  }

  private applyTypingOperation(op: TypingOperation) {
    this.props.document.composeLocalChange(op.changeset);

    // Selection must be updated after as it relies on length of the value
    this.props.selection.setSelectionRange(
      op.selectionStart,
      op.selectionEnd,
      op.selectionDirection
    );
  }

  private updateHistoryFromExternalChange(externalChangeset: Changeset) {
    const entries = this.entries;
    const serverIndex = this.lastExecutedIndex.server;

    let baseChange = serverIndex < 0 ? this.props.document.server : Changeset.EMPTY;

    // Execute before serverIndex (...,e0,e1,e2)
    let followComposition = externalChangeset;
    for (let i = serverIndex; i >= 0; i--) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const entry = entries[i]!;
      entry.execute.selectionStart = followComposition.followIndex(
        entry.execute.selectionStart
      );
      entry.execute.selectionEnd = followComposition.followIndex(
        entry.execute.selectionEnd
      );

      const newChange = entry.undo.changeset.follow(followComposition);
      entry.execute.changeset = entry.execute.changeset.findSwapNewSecondChange(
        followComposition,
        newChange
      );
      followComposition = newChange;
      baseChange = newChange;
    }
    this.serverBaseComposition = this.serverBaseComposition.compose(baseChange);

    // Undo before serverIndex (...,u0,u1,u2) - only calculates new selection
    followComposition = externalChangeset;
    for (let i = serverIndex; i >= 0; i--) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const entry = entries[i]!;
      const undo = entry.undo.changeset;
      // entry.undo.changeset = followComposition.follow(undo);

      entry.undo.selectionStart = followComposition.followIndex(
        entry.undo.selectionStart
      );
      entry.undo.selectionEnd = followComposition.followIndex(entry.undo.selectionEnd);

      followComposition = undo.follow(followComposition);
    }

    // Undo after serverIndex + 1 (u3,u4,...) - only calculates new selection
    followComposition = externalChangeset;
    for (let i = serverIndex + 1; i < entries.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const entry = entries[i]!;
      //const undo = entry.undo.changeset;

      entry.undo.selectionStart = followComposition.followIndex(
        entry.undo.selectionStart
      );
      entry.undo.selectionEnd = followComposition.followIndex(entry.undo.selectionEnd);

      followComposition = entry.execute.changeset.follow(followComposition);

      // entry.undo.changeset = undoAfter.follow(undo);
    }

    // Execute after serverIndex + 1 (e3,e4,...)
    followComposition = externalChangeset;
    for (let i = serverIndex + 1; i < entries.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const entry = entries[i]!;
      const execute = entry.execute.changeset;
      entry.execute.changeset = followComposition.follow(execute);

      followComposition = execute.follow(followComposition);

      entry.execute.selectionStart = followComposition.followIndex(
        entry.execute.selectionStart
      );
      entry.execute.selectionEnd = followComposition.followIndex(
        entry.execute.selectionEnd
      );
    }

    // Calculate new undo from server base value and execute.
    let currentValue = this.serverBaseComposition;
    for (const entry of entries) {
      const newUndo = entry.execute.changeset.inverse(currentValue);
      entry.undo.changeset = newUndo;
      currentValue = currentValue.compose(entry.execute.changeset);
    }

    // Delete empty entries
    for (let i = entries.length - 1; i >= 0; i--) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const entry = entries[i]!;
      if (entry.execute.changeset.isEqual(entry.undo.changeset)) {
        entries.splice(i, 1);
        if (i <= this.lastExecutedIndex.local) {
          this.lastExecutedIndex.local--;
        }
        if (i <= this.lastExecutedIndex.submitted) {
          this.lastExecutedIndex.submitted--;
        }
        if (i <= this.lastExecutedIndex.server) {
          this.lastExecutedIndex.server--;
        }
      }
    }
  }
}
