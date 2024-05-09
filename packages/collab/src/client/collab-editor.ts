/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mitt, { Emitter } from '~utils/mitt-unsub';

import { Changeset, SerializedChangeset } from '../changeset/changeset';
import {
  CollabClient,
  CollabClientEvents,
  CollabClientOptions,
  SerializedCollabClient,
} from './collab-client';

import {
  CollabHistory,
  CollabHistoryOptions,
  LocalChangesetEditorHistoryEvents,
  SerializedCollabHistory,
} from './collab-history';
import {
  OrderedMessageBuffer,
  OrderedMessageBufferOptions,
  ProcessingEvents,
  SerializedOrderedMessageBuffer,
} from '~utils/ordered-message-buffer';

import {
  RevisionChangeset,
  SerializedSubmittedRevisionRecord,
  ServerRevisionRecord,
  SubmittedRevisionRecord,
} from '../records/record';
import {
  RevisionTailRecords,
  RevisionTailRecordsOptions,
  SerializedRevisionTailRecords,
} from '../records/revision-tail-records';
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

type LocalRecord<TChangeset = Changeset> = Omit<
  ServerRevisionRecord<TChangeset>,
  'userGeneratedId' | 'creatorUserId'
>;
type ExternalRecord<TChangeset = Changeset> = PartialBy<
  Omit<ServerRevisionRecord<TChangeset>, 'userGeneratedId'>,
  'beforeSelection' | 'afterSelection' | 'creatorUserId'
>;

type EditorRevisionRecord<TChangeset = Changeset> =
  | LocalRecord<TChangeset>
  | ExternalRecord<TChangeset>;

export enum UnprocessedRecordType {
  SubmittedAcknowleged,
  ExternalChange,
}

export type UnprocessedRecord<TChangeset = Changeset> =
  | {
      type: UnprocessedRecordType.SubmittedAcknowleged;
      record: EditorRevisionRecord<TChangeset>;
    }
  | {
      type: UnprocessedRecordType.ExternalChange;
      record: EditorRevisionRecord<TChangeset>;
    };

export interface HistoryOperationOptions {
  /**
   * Merge text into latest history entry.
   */
  merge: boolean;
}

export interface SerializedCollabEditor {
  // headText: changeset, revision => client.server
  // localChanges: changeset (omit)
  client?: Omit<SerializedCollabClient, 'submitted'>; // submitted from submittedRecord

  // submittedRecord: generatedId, changeset, revision, beforeSelection, afterSelection
  submittedRecord?: SerializedSubmittedRevisionRecord;

  // saved record the need to be processed
  recordsBuffer?: SerializedOrderedMessageBuffer<UnprocessedRecord<SerializedChangeset>>;

  // tailText: changeset, revision
  // serverRecords: [EditorRevisionRecord]
  serverRecords?: SerializedRevisionTailRecords<
    EditorRevisionRecord<SerializedChangeset>
  >;

  history?: SerializedCollabHistory;
  // server will be before submitted?
  // TODO remove repetetive info
  // history: (only after serverIndex, anything before is in serverRecords)
  /*
  [.... serverIndex, ... submittedIndex ... localIndex]
  
  :save
  [.... serverIndex, (... submittedIndex ... localIndex)]
  */
}

type EditorServerRecords = RevisionTailRecords<
  EditorRevisionRecord,
  EditorRevisionRecord<SerializedChangeset>
>;

type EditorServerRecordsOptions = Omit<
  RevisionTailRecordsOptions<
    EditorRevisionRecord,
    EditorRevisionRecord<SerializedChangeset>
  >,
  'serializeRecord'
>;

type UnprocessedRecordsBuffer = OrderedMessageBuffer<
  UnprocessedRecord,
  UnprocessedRecord<SerializedChangeset>
>;

type UnprocessedRecordsBufferOptions = Omit<
  OrderedMessageBufferOptions<UnprocessedRecord, UnprocessedRecord<SerializedChangeset>>,
  'getVersion' | 'serializeMessage'
>;

export interface CollabEditorOptions {
  eventBus?: Emitter<CollabEditorEvents>;
  generateSubmitId?: () => string;
  userId?: string;
  serverRecords?: EditorServerRecords | EditorServerRecordsOptions;
  recordsBuffer?: UnprocessedRecordsBuffer | UnprocessedRecordsBufferOptions;
  client?: CollabClient | CollabClientOptions;
  history?: CollabHistory | Omit<CollabHistoryOptions, 'client'>;
  submittedRecord?: SubmittedRecord;
}

export class CollabEditor {
  readonly eventBus: Emitter<CollabEditorEvents>;
  private generateSubmitId: () => string;
  readonly userId?: string;

  private serverRecords: EditorServerRecords;
  private recordsBuffer: UnprocessedRecordsBuffer;

  private _client: CollabClient;
  private _history: CollabHistory;
  private submittedRecord: SubmittedRecord | null = null;

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

  private unsubscribeFromEvents: () => void;

  static newFromHeadText(headText: RevisionChangeset): CollabEditor {
    return new CollabEditor({
      recordsBuffer: {
        version: headText.revision,
      },
      client: {
        server: headText.changeset,
      },
    });
  }

  constructor(options?: CollabEditorOptions) {
    const subscribedListeners: (() => void)[] = [];
    this.unsubscribeFromEvents = () => {
      subscribedListeners.forEach((unsub) => {
        unsub();
      });
    };

    this.generateSubmitId = options?.generateSubmitId ?? (() => nanoid(6));
    this.userId = options?.userId;

    // Local, submitted, server changesets
    this._client =
      options?.client instanceof CollabClient
        ? options.client
        : new CollabClient(options?.client);
    subscribedListeners.push(
      this._client.eventBus.on('viewChanged', ({ view }) => {
        this._viewText = view.strips.joinInsertions();
      })
    );

    this._viewText = this._client.view.joinInsertions();

    // Submitted record
    this.submittedRecord = options?.submittedRecord ?? null;

    // Store known records from server
    this.serverRecords =
      options?.serverRecords instanceof RevisionTailRecords
        ? options.serverRecords
        : new RevisionTailRecords({
            ...options?.serverRecords,
            serializeRecord(record) {
              return {
                ...record,
                changeset: record.changeset.serialize(),
              };
            },
          });

    // Buffered future records
    this.recordsBuffer =
      options?.recordsBuffer instanceof OrderedMessageBuffer
        ? options.recordsBuffer
        : new OrderedMessageBuffer({
            version: this.serverRecords.headRevision,
            ...options?.recordsBuffer,
            getVersion(message) {
              return message.record.revision;
            },
            serializeMessage(message) {
              return {
                ...message,
                record: {
                  ...message.record,
                  changeset: message.record.changeset.serialize(),
                },
              };
            },
          });
    subscribedListeners.push(
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
      })
    );

    // History for selection and local changeset
    this._history =
      options?.history instanceof CollabHistory
        ? options.history
        : new CollabHistory({
            tailRevision: this.recordsBuffer.currentVersion,
            ...options?.history,
            client: this._client,
          });

    // Link events
    this.eventBus = options?.eventBus ?? mitt();

    subscribedListeners.push(
      this._client.eventBus.on('*', (type, e) => {
        this.eventBus.emit(type, e);
      })
    );

    subscribedListeners.push(
      this._history.eventBus.on('*', (type, e) => {
        this.eventBus.emit(type, e);
      })
    );

    subscribedListeners.push(
      this.recordsBuffer.eventBus.on('nextMessage', (e) => {
        this.eventBus.emit('nextMessage', e);
      })
    );

    const processingBus = mitt<EditorProcessingEvents>();
    subscribedListeners.push(
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
      })
    );

    subscribedListeners.push(
      this.recordsBuffer.eventBus.on('messagesProcessed', () => {
        this.eventBus.emit('revisionChanged', {
          revision: this.headRevision,
          changeset: this._client.server,
        });
      })
    );
  }

  /**
   * Removes event listeners from editor. This instance becomes useless.
   */
  cleanUp() {
    this.unsubscribeFromEvents();
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
