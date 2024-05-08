/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mitt, { Emitter } from '~utils/mitt-unsub';

import { Changeset } from '../changeset/changeset';
import { CollabClient, CollabClientEvents } from './collab-client';

import { CollabHistory, LocalChangesetEditorHistoryEvents } from './collab-history';
import { OrderedMessageBuffer, ProcessingEvents } from '~utils/ordered-message-buffer';

import { EditorRecordsHistoryRestore } from './editor-records-history-restore';
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

  private _client: CollabClient;
  private recordsBuffer: OrderedMessageBuffer<UnprocessedRecord>;
  private serverRecords: RevisionTailRecords<EditorRevisionRecord>;
  private history: CollabHistory;
  private historyRestorer: EditorRecordsHistoryRestore<EditorRevisionRecord>;
  private submittedRecord: SubmittedRecord | null = null;
  

  private generateSubmitId: () => string;

  readonly eventBus: Emitter<CollabEditorEvents>;

  private _viewText = '';
  get viewText() {
    return this._viewText;
  }

  get revision() {
    return this.recordsBuffer.currentVersion;
  }

  get client(): Pick<CollabClient, 'server' | 'submitted' | 'local' | 'view'>{
    return this._client;
  }

  get recordsTailRevision() {
    return this.serverRecords.tailRevision;
  }

  get recordsHeadRevision() {
    return this.serverRecords.headRevision;
  }

  get historyCurrentIndex() {
    return this.history.localIndex;
  }

  get historyEntryCount() {
    return this.history.entries.length;
  }

  get historyEntries() {
    return this.history.entries;
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
    this.history =
      options?.history ??
      new CollabHistory({
        client: this._client,
      });

    // Restores history from server records
    this.historyRestorer = new EditorRecordsHistoryRestore({
      history: this.history,
      records: this.serverRecords,
      historyTailRevision: headText.revision,
    });

    // Link events
    this.eventBus = options?.eventBus ?? mitt();

    this._client.eventBus.on('*', (type, e) => {
      this.eventBus.emit(type, e);
    });

    this.history.eventBus.on('*', (type, e) => {
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
        revision: this.revision,
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
      const lastEntry = this.history.at(-1);
      if (!lastEntry) return;

      this.submittedRecord = new SubmittedRecord({
        userGeneratedId: this.generateSubmitId(),
        revision: this.revision,
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
  historyRestore(desiredRestoreCount: number): number | false {
    return this.historyRestorer.restore(desiredRestoreCount, this.userId);
  }

  /**
   * Insert text after caret position.
   * Anything selected is deleted.
   */
  insertText(insertText: string, selection: SelectionRange) {
    // TODO add option to merge change into existing history entry...
    this.history.pushChangesetOperation(
      insertionOperation(insertText, this.viewText, selection)
    );
  }

  /**
   * Delete based on current caret position towards left (Same as pressing backspace on a keyboard).
   * Anything selected is deleted and counts as 1 {@link count}.
   */
  deleteTextCount(count = 1, selection: SelectionRange) {
    const op = deletionCountOperation(count, this.viewText, selection);
    if (!op) return;
    this.history.pushChangesetOperation(op);
  }

  undo() {
    this.history.undo();
  }

  redo() {
    this.history.redo();
  }
}
