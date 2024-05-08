/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mitt, { Emitter } from '~utils/mitt-unsub';

import { Changeset } from '../changeset/changeset';
import { CollabClient, CollabClientEvents } from './collab-client';

import { CollabHistory, LocalChangesetEditorHistoryEvents } from './collab-history';
import { OrderedMessageBuffer, ProcessingEvents } from '~utils/ordered-message-buffer';

import {
  RevisionChangeset,
  ServerRevisionRecord,
  SubmittedRevisionRecord,
} from '../records/record';
import { RevisionTailRecords } from '../records/revision-tail-records';
import { nanoid } from 'nanoid';
import { PartialBy } from '~utils/types';
import { deletionCountOperation, insertionOperation } from './changeset-operations';
import { SelectionRange } from './selection-range';
import { SubmittedRecord } from './submitted-record';
import { OrderedMessageBufferEvents } from '~utils/ordered-message-buffer';

export type CollabEditorEvents = CollabClientEvents &
  Omit<OrderedMessageBufferEvents<UnprocessedRecord>, 'processingMessages'> &
  LocalChangesetEditorHistoryEvents &
  EditorEvents;

type EditorProcessingEvents = Omit<
  ProcessingEvents<UnprocessedRecord>,
  'messagesProcessed'
> & {
  messagesProcessed: {
    hadExternalChanges: boolean;
  };
} & Pick<CollabClientEvents, 'handledExternalChange'>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EditorEvents = {
  revisionChanged: {
    /**
     * New revision.
     */
    revision: number;
    /**
     * Changeset that matches this revision.
     */
    changeset: Changeset;
  };
  processingMessages: {
    eventBus: Emitter<EditorProcessingEvents>;
  };
};

type LocalRecord = Omit<ServerRevisionRecord, 'userGeneratedId' | 'creatorUserId'>;
type ExternalRecord = PartialBy<
  Omit<ServerRevisionRecord, 'userGeneratedId'>,
  'beforeSelection' | 'afterSelection' | 'creatorUserId'
>;

type EditorRevisionRecord = LocalRecord | ExternalRecord;

export enum UnprocessedRecordType {
  SubmittedAcknowleged,
  ExternalChange,
}

export type UnprocessedRecord =
  | { type: UnprocessedRecordType.SubmittedAcknowleged; record: EditorRevisionRecord }
  | { type: UnprocessedRecordType.ExternalChange; record: EditorRevisionRecord };

export interface HistoryOperationOptions {
  /**
   * Merge text into latest history entry.
   */
  merge: boolean;
}

export interface CollabEditorOptions {
  initialText?:
    | { headText: RevisionChangeset }
    | {
        tailText: RevisionChangeset;
        records: EditorRevisionRecord[];
      };
  userId?: string;
  caretPosition?: number;
  eventBus?: Emitter<CollabEditorEvents>;
  generateSubmitId?: () => string;
  client?: CollabClient;
  history?: CollabHistory;
}

export class CollabEditor {
  readonly userId?: string;

  private serverRecords: RevisionTailRecords<EditorRevisionRecord>;
  private recordsBuffer: OrderedMessageBuffer<UnprocessedRecord>;

  private _client: CollabClient;
  private _history: CollabHistory;
  private submittedRecord: SubmittedRecord | null = null;

  private generateSubmitId: () => string;

  readonly eventBus: Emitter<CollabEditorEvents>;

  get headRevision() {
    return this.recordsBuffer.currentVersion;
  }

  get tailRevision() {
    return this.serverRecords.tailRevision;
  }

  get client(): Pick<CollabClient, 'server' | 'submitted' | 'local' | 'view'> {
    return this._client;
  }

  get history(): Pick<CollabHistory, 'localIndex' | 'entries'> {
    return this._history;
  }

  private _viewText = '';
  get viewText() {
    return this._viewText;
  }

  constructor(options?: CollabEditorOptions) {
    let headText: RevisionChangeset;
    if (options?.initialText) {
      const { initialText } = options;
      if ('tailText' in initialText) {
        this.serverRecords = new RevisionTailRecords({
          tailText: initialText.tailText,
          revisionRecords: {
            records: initialText.records,
          },
        });
        headText = this.serverRecords.getHeadText();
      } else {
        this.serverRecords = new RevisionTailRecords();
        headText = initialText.headText;
      }
    } else {
      this.serverRecords = new RevisionTailRecords();
      headText = this.serverRecords.getHeadText();
    }

    this._viewText = headText.changeset.strips.joinInsertions();
    this.userId = options?.userId;

    this.generateSubmitId = options?.generateSubmitId ?? (() => nanoid(6));

    // Local, submitted, server changesets
    this._client =
      options?.client ??
      new CollabClient({
        server: headText.changeset,
      });
    this._client.eventBus.on('viewChanged', ({ view }) => {
      this._viewText = view.strips.joinInsertions();
    });

    // Revision buffering
    this.recordsBuffer = new OrderedMessageBuffer({
      version: headText.revision,
      getVersion(message) {
        return message.record.revision;
      },
    });
    this.recordsBuffer.eventBus.on('nextMessage', (message) => {
      this.serverRecords.update([message.record]);

      if (message.type == UnprocessedRecordType.SubmittedAcknowleged) {
        this.submittedRecord = null;
        this._client.submittedChangesAcknowledged();
      } else {
        // message.type === UnprocessedRecordType.ExternalChange
        const event = this._client.handleExternalChange(message.record.changeset);
        this.submittedRecord?.processExternalChangeEvent(event);
      }
    });

    // Store known records from server
    this.serverRecords = new RevisionTailRecords();

    // History for selection and local changeset
    this._history =
      options?.history ??
      new CollabHistory({
        client: this._client,
        tailRevision: headText.revision,
      });

    // Link events
    this.eventBus = options?.eventBus ?? mitt();

    this._client.eventBus.on('*', (type, e) => {
      this.eventBus.emit(type, e);
    });

    this._history.eventBus.on('*', (type, e) => {
      this.eventBus.emit(type, e);
    });

    this.recordsBuffer.eventBus.on('nextMessage', (e) => {
      this.eventBus.emit('nextMessage', e);
    });

    const processingBus = mitt<EditorProcessingEvents>();
    this.recordsBuffer.eventBus.on('processingMessages', (e) => {
      e.eventBus.on('nextMessage', (e) => {
        processingBus.emit('nextMessage', e);
      });

      let hadExternalChanges = false;
      const unsubHandledExternalChange = this._client.eventBus.on(
        'handledExternalChange',
        (e) => {
          processingBus.emit('handledExternalChange', e);
          hadExternalChanges = true;
        }
      );

      e.eventBus.on('messagesProcessed', () => {
        try {
          processingBus.emit('messagesProcessed', {
            hadExternalChanges,
          });
        } finally {
          processingBus.all.clear();
          unsubHandledExternalChange();
        }
      });

      this.eventBus.emit('processingMessages', {
        eventBus: processingBus,
      });
    });

    this.recordsBuffer.eventBus.on('messagesProcessed', () => {
      this.eventBus.emit('revisionChanged', {
        revision: this.headRevision,
        changeset: this._client.server,
      });
    });
  }

  haveSubmittedChanges() {
    return this._client.haveSubmittedChanges();
  }

  haveLocalChanges() {
    return this._client.haveLocalChanges();
  }

  canSubmitChanges() {
    return this._client.canSubmitChanges();
  }

  /**
   *
   * @returns Revision changeset that can be send to the server. Contains all
   * changes since last submission. Returns undefined if changes cannot be submitted.
   * Either due to existing submitted changes or no local changes exist.
   */
  submitChanges(): SubmittedRevisionRecord | undefined | null {
    if (this._client.submitChanges()) {
      const lastEntry = this._history.at(-1);
      if (!lastEntry) return;

      this.submittedRecord = new SubmittedRecord({
        userGeneratedId: this.generateSubmitId(),
        revision: this.headRevision,
        changeset: this._client.submitted,
        beforeSelection: lastEntry.undo.selection,
        afterSelection: lastEntry.execute.selection,
      });
    }

    return this.submittedRecord;
  }

  /**
   * Acknowledge submitted changes.
   */
  submittedChangesAcknowledged(record: EditorRevisionRecord) {
    this.recordsBuffer.add({
      type: UnprocessedRecordType.SubmittedAcknowleged,
      record: record,
    });
  }

  /**
   * Handles external change that is created by another client during
   * collab editing.
   */
  handleExternalChange(record: EditorRevisionRecord) {
    this.recordsBuffer.add({
      type: UnprocessedRecordType.ExternalChange,
      record: record,
    });
  }

  addServerRecords(
    records: Readonly<EditorRevisionRecord[]>,
    newTailText?: RevisionChangeset
  ) {
    if (newTailText) {
      this.serverRecords.updateWithTailText(newTailText, records);
    } else {
      this.serverRecords.update(records);
    }
  }

  /**
   * Restores up to {@link desiredRestoreCount} history entries. Server records
   * must be available. Add them using method {@link addServerRecords}.
   */
  historyRestore(desiredRestoreCount: number): number | undefined {
    return this._history.restoreFromServerRecords(
      this.serverRecords,
      desiredRestoreCount,
      this.userId
    );
  }

  /**
   * Insert text after caret position.
   * Anything selected is deleted.
   */
  insertText(
    insertText: string,
    selection: SelectionRange,
    options?: HistoryOperationOptions
  ) {
    const op = insertionOperation(insertText, this.viewText, selection);
    if (options?.merge) {
      this.historyMergedCall(() => {
        this._history.pushChangesetOperation(op);
      });
    } else {
      this._history.pushChangesetOperation(op);
    }
  }

  private historyMergedCall(fn: () => void) {
    const beforeIndex = this._history.localIndex;
    fn();
    const afterIndex = this._history.localIndex;
    this._history.merge(beforeIndex, afterIndex);
  }

  /**
   * Delete based on current caret position towards left (Same as pressing backspace on a keyboard).
   * Anything selected is deleted and counts as 1 {@link count}.
   */
  deleteTextCount(
    count = 1,
    selection: SelectionRange,
    options?: HistoryOperationOptions
  ) {
    const op = deletionCountOperation(count, this.viewText, selection);
    if (!op) return;

    if (options?.merge) {
      this.historyMergedCall(() => {
        this._history.pushChangesetOperation(op);
      });
    } else {
      this._history.pushChangesetOperation(op);
    }
  }

  undo() {
    this._history.undo();
  }

  redo() {
    this._history.redo();
  }
}
