import { Emitter } from 'mitt';

import { Changeset } from '../changeset/changeset';
import {
  DocumentClient,
  Events as DocumentClientEvents,
} from '../client/document-client';

import { Events as ChangesetEditorEvents } from './changeset-editor';
import { SelectionRange } from './selection-range';
import { AnyEntry, Entry, Operation, TailDocumentHistory } from './tail-document-history';

interface LocalChangesetEditorHistoryOptions {
  selection: SelectionRange;
  editorBus: Emitter<Pick<ChangesetEditorEvents, 'change'>>;
  document: DocumentClient;
  tailHistory?: TailDocumentHistory;
}

/**
 * Maintains a history of {@link DocumentClient.local} changeset and {@link SelectionRange} state.
 * External changes alter history as if change has always been there.
 */
export class LocalChangesetEditorHistory {
  private history: TailDocumentHistory;

  private document: DocumentClient;
  private selection: SelectionRange;

  get entries() {
    return this.history.entries;
  }

  get tailDocument() {
    return this.history.tailDocument;
  }

  get currentIndex() {
    return this.lastExecutedIndex.local;
  }

  private lastExecutedIndex = {
    server: -1,
    submitted: -1,
    local: -1,
  };

  private unsubscribeFromEvents: () => void;

  constructor(options: LocalChangesetEditorHistoryOptions) {
    const { selection, editorBus: editorBus, document } = options;
    this.document = document;
    this.selection = selection;

    this.history =
      options.tailHistory ??
      new TailDocumentHistory({
        tail: document.server,
      });

    this.history.eventBus.on('entryAtIndexDeleted', ({ index }) => {
      if (index <= this.lastExecutedIndex.local) {
        this.lastExecutedIndex.local--;
      }
      if (index <= this.lastExecutedIndex.submitted) {
        this.lastExecutedIndex.submitted--;
      }
      if (index <= this.lastExecutedIndex.server) {
        this.lastExecutedIndex.server--;
      }
    });

    const editorChangeListener = ({
      changeset,
      inverseChangeset,
      selectionPos,
    }: ChangesetEditorEvents['change']) => {
      this.push({
        execute: {
          changeset,
          selectionStart: selectionPos,
          selectionEnd: selectionPos,
        },
        undo: {
          changeset: inverseChangeset,
          selectionStart: selection.start,
          selectionEnd: selection.end,
        },
      });
    };

    const submitChangesListener = () => {
      this.lastExecutedIndex.submitted = this.lastExecutedIndex.local;
    };

    const submittedChangesAcknowledgedListener = () => {
      this.lastExecutedIndex.server = this.lastExecutedIndex.submitted;
    };

    const handledExternalChangeListener = ({
      externalChange,
    }: DocumentClientEvents['handledExternalChange']) => {
      this.adjustHistoryToExternalChange(externalChange);
    };

    editorBus.on('change', editorChangeListener);
    document.eventBus.on('submitChanges', submitChangesListener);
    document.eventBus.on(
      'submittedChangesAcknowledged',
      submittedChangesAcknowledgedListener
    );
    document.eventBus.on('handledExternalChange', handledExternalChangeListener);

    this.unsubscribeFromEvents = () => {
      editorBus.off('change', editorChangeListener);
      document.eventBus.off('submitChanges', submitChangesListener);
      document.eventBus.off(
        'submittedChangesAcknowledged',
        submittedChangesAcknowledgedListener
      );
      document.eventBus.off('handledExternalChange', handledExternalChangeListener);
    };
  }

  /**
   *
   * @param index Negative index counts from end of entries. -1 is last entry.
   * @returns
   */
  at(index: number): Entry | undefined {
    if (index < 0) {
      if (-index < this.entries.length) {
        index %= this.entries.length;
      }
      index += this.entries.length;
    }

    return this.entries[index];
  }

  /**
   * Removes event listeners. This instance becomes useless.
   */
  cleanUp() {
    this.unsubscribeFromEvents();
  }

  private push(entry: Entry) {
    if (this.lastExecutedIndex.local < this.history.entries.length - 1) {
      this.history.deleteNewerEntries(this.lastExecutedIndex.local);

      this.lastExecutedIndex.submitted = Math.min(
        this.lastExecutedIndex.submitted,
        this.lastExecutedIndex.local
      );
      this.lastExecutedIndex.server = Math.min(
        this.lastExecutedIndex.server,
        this.lastExecutedIndex.submitted
      );
    }

    this.history.push([entry]);
    this.lastExecutedIndex.local++;
    const newEntry = this.history.entries[this.history.entries.length - 1];
    if (newEntry) {
      this.applyTypingOperation(newEntry.execute);
    }
  }

  /**
   * @param tailDocument First element in {@link entries} is composable on {@link entries}.
   * @param entries Document entries.
   */
  restoreHistoryEntries(tailDocument: Changeset, entries: AnyEntry[]) {
    const beforeEntriesCount = this.history.entries.length;

    this.history.unshift(tailDocument, entries);

    const addedEntriesCount = this.history.entries.length - beforeEntriesCount;
    this.lastExecutedIndex.server += addedEntriesCount;
    this.lastExecutedIndex.submitted += addedEntriesCount;
    this.lastExecutedIndex.local += addedEntriesCount;
    
    return addedEntriesCount;
  }

  undo() {
    const entry = this.history.entries[this.lastExecutedIndex.local];
    if (entry) {
      this.applyTypingOperation(entry.undo);
      this.lastExecutedIndex.local--;
    }
  }

  redo() {
    const entry = this.history.entries[this.lastExecutedIndex.local + 1];
    if (entry) {
      this.applyTypingOperation(entry.execute);
      this.lastExecutedIndex.local++;
    }
  }

  private applyTypingOperation(op: Operation) {
    this.document.composeLocalChange(op.changeset);

    // Selection must be updated after as it relies on length of the value
    this.selection.setSelectionRange(op.selectionStart, op.selectionEnd);
  }

  private adjustHistoryToExternalChange(externalChangeset: Changeset) {
    if (this.lastExecutedIndex.server >= 0) {
      this.history.composeOnAllEntries(externalChangeset, this.lastExecutedIndex.server);
    } else {
      this.history.composeOnAllEntries(externalChangeset, this.document.server);
    }
  }
}
