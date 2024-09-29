/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { nanoid } from 'nanoid';

import mitt, { Emitter } from 'mitt';
import {
  OrderedMessageBuffer,
  OrderedMessageBufferParams,
  OrderedMessageBufferParamsStruct,
  ProcessingEvents,
} from '~utils/ordered-message-buffer';
import { OrderedMessageBufferEvents } from '~utils/ordered-message-buffer';
import {
  RevisionChangeset,
  ServerRevisionRecordStruct,
  SubmittedRevisionRecord,
  SubmittedRevisionRecordStruct,
} from '../records/record';

import {
  CollabClient,
  CollabClientEvents,
  CollabClientOptions,
  CollabClientOptionsStruct,
} from './collab-client';
import {
  CollabHistory,
  CollabHistoryOptions,
  CollabHistoryOptionsStruct,
  LocalChangesetEditorHistoryEvents,
} from './collab-history';
import { SubmittedRecord } from './submitted-record';
import { UserRecords } from './user-records';
import { Changeset } from '../changeset';
import { assign, Infer, object, omit, optional, union, literal } from 'superstruct';
import { SelectionChangeset, SimpleTextOperationOptions } from './types';

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
  handledExternalChanges: readonly Readonly<{
    event: CollabClientEvents['handledExternalChange'];
    revision: number;
  }>[];
  submittedRecord: {
    /**
     * Record that is ready to be submitted to the server.
     */
    submittedRecord: SubmittedRecord;
  };
  /**
   * Need records from start to end (inclusive) to continue editing.
   */
  missingRevisions: { start: number; end: number };
};

const LocalRecordStruct = assign(
  ServerRevisionRecordStruct,
  object({
    userGeneratedId: optional(ServerRevisionRecordStruct.schema.userGeneratedId),
    creatorUserId: optional(ServerRevisionRecordStruct.schema.creatorUserId),
  })
);

const ExternalRecordStruct = assign(
  omit(ServerRevisionRecordStruct, ['userGeneratedId']),
  object({
    beforeSelection: optional(ServerRevisionRecordStruct.schema.beforeSelection),
    afterSelection: optional(ServerRevisionRecordStruct.schema.afterSelection),
    creatorUserId: optional(ServerRevisionRecordStruct.schema.creatorUserId),
  })
);

const EditorRevisionRecordStruct = union([LocalRecordStruct, ExternalRecordStruct]);

export type EditorRevisionRecord = Infer<typeof EditorRevisionRecordStruct>;

const UnprocessedRecordStruct = union([
  object({
    type: literal('SUBMITTED_ACKNOWLEDGED'),
    record: EditorRevisionRecordStruct,
  }),
  object({
    type: literal('EXTERNAL_CHANGE'),
    record: EditorRevisionRecordStruct,
  }),
]);

export type UnprocessedRecord = Infer<typeof UnprocessedRecordStruct>;

const CollabEditorOptionsStruct = object({
  client: omit(CollabClientOptionsStruct, ['submitted']), // instead of omit make it optional?
  submittedRecord: optional(SubmittedRevisionRecordStruct),
  recordsBuffer: optional(OrderedMessageBufferParamsStruct(UnprocessedRecordStruct)),
  history: omit(CollabHistoryOptionsStruct, ['tailRevision', 'tailText']),
});

type UnprocessedRecordsBuffer = OrderedMessageBuffer<typeof UnprocessedRecordStruct>;

type UnprocessedRecordsBufferOptions = Omit<
  OrderedMessageBufferParams<typeof UnprocessedRecordStruct>,
  'getVersion' | 'serializeMessage'
>;

export interface CollabEditorOptions {
  eventBus?: Emitter<CollabEditorEvents>;
  generateSubmitId?: () => string;
  userRecords?: UserRecords;
  recordsBuffer?:
    | UnprocessedRecordsBuffer
    | Omit<UnprocessedRecordsBufferOptions, 'messageMapper'>;
  client?: CollabClient | CollabClientOptions;
  history?: CollabHistory | Omit<CollabHistoryOptions, 'client'>;
  submittedRecord?: SubmittedRecord;
}

// TODO rename to CollabComposition
export class CollabEditor {
  readonly eventBus: Emitter<CollabEditorEvents>;
  private generateSubmitId: () => string;

  private _userRecords?: UserRecords | null;
  get userRecords() {
    return this._userRecords;
  }
  set userRecords(value) {
    value = value ?? null;

    this._userRecords = value;
    this.eventBus.emit('userRecordsUpdated', {
      userRecords: value,
    });
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

  private _viewText: string | null = null;
  get viewText() {
    if (this._viewText === null) {
      this._viewText = this._client.view.joinInsertions();
    }
    return this._viewText;
  }

  private unsubscribeFromEvents: () => void;

  static newFromHeadText: (headText: RevisionChangeset) => CollabEditor = (headText) => {
    return new CollabEditor(CollabEditor.headTextAsOptions(headText));
  };

  static headTextAsOptions: (headText: RevisionChangeset) => CollabEditorOptions = (
    headText
  ) => {
    return {
      recordsBuffer: {
        version: headText.revision,
      },
      client: {
        server: headText.changeset,
      },
    };
  };

  constructor(options?: CollabEditorOptions) {
    const headText: RevisionChangeset = {
      changeset: options?.client?.server ?? Changeset.EMPTY,
      revision:
        options?.recordsBuffer instanceof OrderedMessageBuffer
          ? options.recordsBuffer.currentVersion
          : (options?.recordsBuffer?.version ?? 0),
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
      this._client.eventBus.on('viewChanged', () => {
        this._viewText = null;
      })
    );

    // Submitted record
    this._submittedRecord = options?.submittedRecord ?? null;

    // Buffered future records
    this.recordsBuffer =
      options?.recordsBuffer instanceof OrderedMessageBuffer
        ? options.recordsBuffer
        : new OrderedMessageBuffer({
            version: headText.revision,
            ...options?.recordsBuffer,
            messageMapper: {
              struct: UnprocessedRecordStruct,
              version(message) {
                return message.record.revision;
              },
            },
          });
    subscribedListeners.push(
      this.recordsBuffer.eventBus.on('nextMessage', (message) => {
        if (message.type == 'SUBMITTED_ACKNOWLEDGED') {
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
    this.userRecords = options?.userRecords ?? null;

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
        const externalChangePayloads: {
          event: CollabClientEvents['handledExternalChange'];
          revision: number;
        }[] = [];
        const unsubHandledExternalChange = this._client.eventBus.on(
          'handledExternalChange',
          (e) => {
            processingBus.emit('handledExternalChange', e);
            externalChangePayloads.push({
              event: e,
              revision: this.recordsBuffer.currentVersion,
            });
            // also info about view?
            hadExternalChanges = true;
          }
        );

        e.eventBus.on('messagesProcessed', () => {
          try {
            processingBus.emit('messagesProcessed', {
              hadExternalChanges,
            });
            this.eventBus.emit('handledExternalChanges', externalChangePayloads);
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

    subscribedListeners.push(
      this.recordsBuffer.eventBus.on('missingMessages', (e) => {
        this.eventBus.emit('missingRevisions', e);
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
   * Completely resets editor state and clears all data.
   */
  reset() {
    this._client.reset();
    this._history.reset();
    this.recordsBuffer.reset();

    this.eventBus.emit('headRevisionChanged', {
      revision: this.headRevision,
      changeset: this._client.server,
    });
    this.eventBus.emit('replacedHeadText', {
      headText: this.headText,
    });
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

  getMissingRevisions() {
    return this.recordsBuffer.getMissingVersions();
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
      type: 'SUBMITTED_ACKNOWLEDGED',
      record: record,
    });
  }

  /**
   * Handles external change that is created by another client during
   * collab editing.
   */
  handleExternalChange(record: EditorRevisionRecord) {
    this.recordsBuffer.add({
      type: 'EXTERNAL_CHANGE',
      record: record,
    });
  }

  pushSelectionChangeset(
    value: SelectionChangeset,
    options?: SimpleTextOperationOptions
  ) {
    this._history.pushSelectionChangeset(value, options);
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

  serialize(historyRemoveServerEntries = true) {
    return CollabEditorOptionsStruct.maskRaw({
      client: this._client.serialize(),
      submittedRecord: this._submittedRecord,
      recordsBuffer: this.recordsBuffer.serialize(),
      history: this._history.serialize(historyRemoveServerEntries),
    });
  }

  static parseValue(
    value: unknown
  ): Pick<
    CollabEditorOptions,
    'client' | 'submittedRecord' | 'recordsBuffer' | 'history'
  > {
    const options = CollabEditorOptionsStruct.create(value);

    return {
      ...options,
      client: {
        ...options.client,
        submitted: options.submittedRecord?.changeset,
      },
      history: {
        ...options.history,
        tailRevision: options.recordsBuffer?.version,
        tailText: options.client.server,
      },
      submittedRecord: options.submittedRecord
        ? new SubmittedRecord(options.submittedRecord)
        : undefined,
    };
  }
}
