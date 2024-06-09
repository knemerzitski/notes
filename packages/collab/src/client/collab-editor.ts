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
import { nanoid } from 'nanoid';
import { PartialBy } from '~utils/types';
import { deletionCountOperation, insertionOperation } from './changeset-operations';
import { SelectionRange } from './selection-range';
import { SubmittedRecord } from './submitted-record';
import { OrderedMessageBufferEvents } from '~utils/ordered-message-buffer';
import {
  ParseError,
  Serializable,
  assertHasProperties,
  parseNumber,
} from '~utils/serialize';
import { UserRecords } from './user-records';

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
  headRevisionChanged: {
    /**
     * New revision.
     */
    revision: number;
    /**
     * Changeset that matches this revision.
     */
    changeset: Changeset;
  };
  replacedHeadText: {
    /**
     * New headText.
     */
    headText: RevisionChangeset;
  };
  userRecordsUpdated: {
    /**
     * User records has new data or it's been replaced with a different instance.
     */
    userRecords: UserRecords | null;
  };
  processingMessages: {
    eventBus: Emitter<EditorProcessingEvents>;
  };
  submittedRecord: {
    /**
     * Record that is ready to be submitted to the server.
     */
    submittedRecord: SubmittedRecord;
  };
};

type LocalRecord<TChangeset = Changeset> = PartialBy<
  ServerRevisionRecord<TChangeset>,
  'userGeneratedId' | 'creatorUserId'
>;
type ExternalRecord<TChangeset = Changeset> = PartialBy<
  Omit<ServerRevisionRecord<TChangeset>, 'userGeneratedId'>,
  'beforeSelection' | 'afterSelection' | 'creatorUserId'
>;

export type EditorRevisionRecord<TChangeset = Changeset> =
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

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace UnprocessedRecord {
  export function getVersion(message: UnprocessedRecord) {
    return message.record.revision;
  }

  export function serialize(message: UnprocessedRecord) {
    return {
      ...message,
      record: EditorServerRecord.serialize(message.record),
    };
  }

  export function parseValue(value: unknown): UnprocessedRecord {
    assertHasProperties(value, ['type', 'record']);

    const type = value.type;
    if (
      type !== UnprocessedRecordType.ExternalChange &&
      type !== UnprocessedRecordType.SubmittedAcknowleged
    ) {
      throw new ParseError(`Unknown record type ${String(type)}`);
    }

    return {
      type,
      record: EditorServerRecord.parseValue(value.record),
    };
  }
}

export interface HistoryOperationOptions {
  /**
   * Merge text into latest history entry.
   */
  merge: boolean;
}

export interface SerializedCollabEditor {
  client: Omit<SerializedCollabClient, 'submitted'>;
  submittedRecord?: SerializedSubmittedRevisionRecord;
  recordsBuffer?: SerializedOrderedMessageBuffer<UnprocessedRecord<SerializedChangeset>>;
  history: Omit<SerializedCollabHistory, 'tailRevision' | 'tailText'>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EditorServerRecord {
  export function serialize(
    record: EditorRevisionRecord
  ): EditorRevisionRecord<SerializedChangeset> {
    return {
      revision: record.revision,
      creatorUserId: (record as { creatorUserId?: ExternalRecord['creatorUserId'] })
        .creatorUserId,
      beforeSelection: record.beforeSelection,
      afterSelection: record.afterSelection,
      changeset: record.changeset.serialize(),
    };
  }

  export function parseValue(value: unknown): EditorRevisionRecord {
    assertHasProperties(value, ['revision', 'changeset']);

    const typedValue = value as typeof value & {
      beforeSelection?: unknown;
      afterSelection?: unknown;
      creatorUserId?: unknown;
    };

    return {
      changeset: Changeset.parseValue(typedValue.changeset),
      revision: parseNumber(typedValue.revision),
      creatorUserId: typedValue.creatorUserId
        ? String(typedValue.creatorUserId)
        : undefined,
      beforeSelection: SelectionRange.parseValueMaybe(typedValue.beforeSelection),
      afterSelection: SelectionRange.parseValueMaybe(typedValue.afterSelection),
    };
  }
}

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
  userRecords?: UserRecords;
  recordsBuffer?: UnprocessedRecordsBuffer | UnprocessedRecordsBufferOptions;
  client?: CollabClient | CollabClientOptions;
  history?: CollabHistory | Omit<CollabHistoryOptions, 'client'>;
  submittedRecord?: SubmittedRecord;
}

export class CollabEditor implements Serializable<SerializedCollabEditor> {
  readonly eventBus: Emitter<CollabEditorEvents>;
  private generateSubmitId: () => string;

  private _userRecords?: UserRecords | null;
  get userRecords() {
    return this._userRecords;
  }

  private recordsBuffer: UnprocessedRecordsBuffer;

  private _client: CollabClient;
  private _history: CollabHistory;

  private _submittedRecord: SubmittedRecord | null = null;
  get submittedRecord() {
    return this._submittedRecord;
  }

  get headRevision() {
    return this.recordsBuffer.currentVersion;
  }

  get client(): Pick<CollabClient, 'server' | 'submitted' | 'local' | 'view'> {
    return this._client;
  }

  get history(): Pick<CollabHistory, 'localIndex' | 'entries' | 'tailRevision'> {
    return this._history;
  }

  get headText(): RevisionChangeset {
    return {
      revision: this.recordsBuffer.currentVersion,
      changeset: this._client.server,
    };
  }

  private _viewText = '';
  get viewText() {
    return this._viewText;
  }

  private unsubscribeFromEvents: () => void;

  static newFromHeadText(headText: RevisionChangeset): CollabEditor {
    return new CollabEditor(CollabEditor.headTextAsOptions(headText));
  }

  static headTextAsOptions(headText: RevisionChangeset): CollabEditorOptions {
    return {
      recordsBuffer: {
        version: headText.revision,
      },
      client: {
        server: headText.changeset,
      },
    };
  }

  constructor(options?: CollabEditorOptions) {
    const headText: RevisionChangeset = {
      changeset: options?.client?.server ?? Changeset.EMPTY,
      revision:
        options?.recordsBuffer instanceof OrderedMessageBuffer
          ? options.recordsBuffer.currentVersion
          : options?.recordsBuffer?.version ?? 0,
    };

    const subscribedListeners: (() => void)[] = [];
    this.unsubscribeFromEvents = () => {
      subscribedListeners.forEach((unsub) => {
        unsub();
      });
    };

    this.generateSubmitId = options?.generateSubmitId ?? (() => nanoid(6));

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
    this._submittedRecord = options?.submittedRecord ?? null;

    // Buffered future records
    this.recordsBuffer =
      options?.recordsBuffer instanceof OrderedMessageBuffer
        ? options.recordsBuffer
        : new OrderedMessageBuffer({
            version: headText.revision,
            ...options?.recordsBuffer,
            getVersion: UnprocessedRecord.getVersion,
            serializeMessage: UnprocessedRecord.serialize,
          });
    subscribedListeners.push(
      this.recordsBuffer.eventBus.on('nextMessage', (message) => {
        if (message.type == UnprocessedRecordType.SubmittedAcknowleged) {
          this._submittedRecord = null;
          this._client.submittedChangesAcknowledged();
        } else {
          // message.type === UnprocessedRecordType.ExternalChange
          const event = this._client.handleExternalChange(message.record.changeset);
          this._submittedRecord?.processExternalChangeEvent(event);
        }
      })
    );

    // History for selection and local changeset
    this._history =
      options?.history instanceof CollabHistory
        ? options.history
        : new CollabHistory({
            tailText: headText.changeset,
            tailRevision: headText.revision,
            ...options?.history,
            client: this._client,
          });

    // Link events
    this.eventBus = options?.eventBus ?? mitt();

    // Records of a specific user
    this.setUserRecords(options?.userRecords ?? null);

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
        this.eventBus.emit('headRevisionChanged', {
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

  /**
   * Replaces current headText with a new one. Must not have any submitted or local changes.
   *
   */
  replaceHeadText(headText: RevisionChangeset) {
    if (headText.revision === this.recordsBuffer.currentVersion) return;

    if (this.haveLocalChanges()) {
      throw new Error('Cannot replace headText. Have local changes.');
    }
    if (this.haveSubmittedChanges()) {
      throw new Error('Cannot replace headText. Have submitted changes.');
    }

    this._client.reset({
      server: headText.changeset,
    });
    this._history.reset({
      tailRevision: headText.revision,
    });
    this.recordsBuffer.setVersion(headText.revision);

    this.eventBus.emit('headRevisionChanged', {
      revision: this.headRevision,
      changeset: this._client.server,
    });
    this.eventBus.emit('replacedHeadText', {
      headText: this.headText,
    });
  }

  // TODO use simple set
  setUserRecords(userRecords: UserRecords | null) {
    this._userRecords = userRecords;
    this.eventBus.emit('userRecordsUpdated', {
      userRecords,
    });
  }

  haveSubmittedChanges() {
    return this._client.haveSubmittedChanges();
  }

  haveLocalChanges() {
    return this._client.haveLocalChanges();
  }

  haveChanges() {
    return this.haveSubmittedChanges() || this.haveLocalChanges();
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
      const historySelection = this._history.getSubmitSelection();
      if (!historySelection) {
        throw new Error('Expected to have selection from history to submit changes.');
      }

      this._submittedRecord = new SubmittedRecord({
        ...historySelection,
        userGeneratedId: this.generateSubmitId(),
        revision: this.headRevision,
        changeset: this._client.submitted,
      });

      this.eventBus.emit('submittedRecord', { submittedRecord: this._submittedRecord });
    }

    return this._submittedRecord;
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

  /**
   * Restores up to {@link desiredRestoreCount} history entries. Server records
   * must be available. Add them using method {@link addServerRecords}.
   */
  historyRestore(desiredRestoreCount: number): number | undefined {
    if (!this._userRecords) return;

    return this._history.restoreFromUserRecords(this._userRecords, desiredRestoreCount);
  }

  canRedo() {
    return this._history.canRedo();
  }

  canUndo() {
    return this._history.canUndo() || this.canRestoreHistory();
  }

  private canRestoreHistory() {
    return this._userRecords?.hasOwnOlderRecords(this._history.tailRevision);
  }

  undo() {
    if (this._history.undo()) return true;

    if (this.canRestoreHistory()) {
      const restoreCount = this.historyRestore(1);
      if (restoreCount != null && restoreCount >= 1) {
        return this._history.undo();
      }
    }

    return false;
  }

  redo() {
    return this._history.redo();
  }

  serialize(historyRemoveServerEntries = true): SerializedCollabEditor {
    const s_client = this._client.serialize();
    // Using submittedRecord
    delete s_client.submitted;

    const s_history: PartialBy<SerializedCollabHistory, 'tailText' | 'tailRevision'> =
      this._history.serialize(historyRemoveServerEntries);
    // tailRevision and text can be retrieved from headText
    delete s_history.tailRevision;
    delete s_history.tailText;

    const recordsBuffer = this.recordsBuffer.serialize();

    return {
      client: s_client,
      submittedRecord: this._submittedRecord?.serialize(),
      ...(recordsBuffer.version !== OrderedMessageBuffer.DEFAULT_VERSION ||
      recordsBuffer.messages.length > 0
        ? { recordsBuffer }
        : {}),
      history: s_history,
    };
  }

  static parseValue(value: {
    recordsBuffer?: unknown;
  }): Pick<
    CollabEditorOptions,
    'client' | 'submittedRecord' | 'recordsBuffer' | 'history'
  > {
    assertHasProperties(value, ['client', 'history']);

    const client = CollabClient.parseValue(value.client);

    const submittedRecordMaybe = SubmittedRecord.parseValueMaybe(
      (value as { submittedRecord?: unknown }).submittedRecord
    );
    const submittedRecord = submittedRecordMaybe
      ? new SubmittedRecord(submittedRecordMaybe)
      : undefined;
    client.submitted = submittedRecord?.changeset;

    const recordsBuffer = value.recordsBuffer
      ? OrderedMessageBuffer.parseValue(value.recordsBuffer, (message) =>
          UnprocessedRecord.parseValue(message)
        )
      : {
          version: OrderedMessageBuffer.DEFAULT_VERSION,
          messages: [],
        };

    const history = CollabHistory.parseValue(value.history);
    history.tailRevision = recordsBuffer.version;
    history.tailText = client.server;

    return {
      client,
      submittedRecord,
      recordsBuffer,
      history,
    };
  }
}
