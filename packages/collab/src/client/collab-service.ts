import mitt, { Emitter, ReadEmitter } from 'mitt';
import { nanoid } from 'nanoid';

import {
  assign,
  Infer,
  object,
  omit,
  optional,
  union,
  literal,
  nullable,
} from 'superstruct';

import { Logger } from '../../../utils/src/logging';

import {
  OrderedMessageBufferEvents,
  ProcessingEvents,
  OrderedMessageBufferParamsStruct,
  OrderedMessageBuffer,
  OrderedMessageBufferParams,
} from '../../../utils/src/ordered-message-buffer';

import { Changeset } from '../changeset';
import {
  CollabHistory,
  CollabHistoryEvents,
  CollabHistoryOptions,
  CollabHistoryOptionsStruct,
} from '../history/collab-history';
import {
  RevisionChangeset,
  ServerRevisionRecordStruct,
  SubmittedRevisionRecord,
  SubmittedRevisionRecordStruct,
} from '../records/record';
import { SimpleTextOperationOptions, SelectionChangeset } from '../types';

import { SubmittedRecord } from './submitted-record';
import { UserRecords, UserRecordsEvents } from './user-records';

export type CollabServiceEvents = Omit<CollabHistoryEvents, 'handledExternalChange'> &
  Omit<OrderedMessageBufferEvents<UnprocessedRecord>, 'processingMessages'> &
  CustomCollabServiceEvents;

type CollabServiceProcessingEvents = Omit<
  ProcessingEvents<UnprocessedRecord>,
  'messagesProcessed'
> & {
  messagesProcessed: {
    hadExternalChanges: boolean;
  };
} & Pick<CollabHistoryEvents, 'handledExternalChange'>;

interface CustomCollabServiceEvents {
  headRevisionChanged: Readonly<{
    /**
     * New revision.
     */
    revision: number;
    /**
     * Changeset that matches this revision.
     */
    changeset: Changeset;
  }>;
  replacedHeadText: Readonly<{
    /**
     * New headText.
     */
    headText: RevisionChangeset;
  }>;
  userRecordsUpdated: Readonly<{
    /**
     * User records has new data or it's been replaced with a different instance.
     */
    userRecords: UserRecords | null;
  }>;
  userRecordsFilterNewestRecordIterable: UserRecordsEvents['filterNewestRecordIterable'];
  processingMessages: Readonly<{
    eventBus: Emitter<CollabServiceProcessingEvents>;
  }>;
  handledExternalChange: CollabHistoryEvents['handledExternalChange'] &
    Readonly<{
      revision: number;
    }>;
  handledExternalChanges: readonly Readonly<{
    event: CollabHistoryEvents['handledExternalChange'];
    revision: number;
  }>[];
  submittedRecord: Readonly<{
    /**
     * Record that is ready to be submitted to the server.
     */
    submittedRecord: SubmittedRecord;
  }>;
  /**
   * Need records from start to end (inclusive) to continue editing.
   */
  missingRevisions: Readonly<{ start: number; end: number }>;
}

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

const CollabServiceRecordStruct = union([LocalRecordStruct, ExternalRecordStruct]);

export type CollabServiceRecord = Infer<typeof CollabServiceRecordStruct>;

const UnprocessedRecordStruct = union([
  object({
    type: literal('SUBMITTED_ACKNOWLEDGED'),
    record: CollabServiceRecordStruct,
  }),
  object({
    type: literal('EXTERNAL_CHANGE'),
    record: CollabServiceRecordStruct,
  }),
]);

export type UnprocessedRecord = Infer<typeof UnprocessedRecordStruct>;

const CollabServiceOptionsStruct = object({
  submittedRecord: nullable(SubmittedRevisionRecordStruct),
  recordsBuffer: optional(OrderedMessageBufferParamsStruct(UnprocessedRecordStruct)),
  history: CollabHistoryOptionsStruct,
});

type UnprocessedRecordsBuffer = OrderedMessageBuffer<typeof UnprocessedRecordStruct>;

type UnprocessedRecordsBufferOptions = Omit<
  OrderedMessageBufferParams<typeof UnprocessedRecordStruct>,
  'getVersion' | 'serializeMessage'
>;

export interface CollabServiceOptions {
  logger?: Logger;
  eventBus?: Emitter<CollabServiceEvents>;
  generateSubmitId?: () => string;
  userRecords?: UserRecords;
  recordsBuffer?:
    | UnprocessedRecordsBuffer
    | Omit<UnprocessedRecordsBufferOptions, 'messageMapper'>;
  history?: CollabHistory | Omit<CollabHistoryOptions, 'service'>;
  submittedRecord?: SubmittedRecord;
}

/**
 * Composition of collab instances that are bound by events:
 * - CollabClient - Client collab state by changesets: server, submitted, local, view
 * - CollabHistory - Keeps track of local changeset changes and allows to redo/undo those changes.
 * - UserRecords - Facade for server records that enables fetching n-count of specific user records from server to restore older history records.
 *
 * Single place to handle records received by server and to create a submittable record.
 */
export class CollabService {
  public readonly logger;

  private readonly _eventBus: Emitter<CollabServiceEvents>;
  get eventBus(): ReadEmitter<CollabServiceEvents> {
    return this._eventBus;
  }

  private generateSubmitId: () => string;

  private _userRecords?: UserRecords | null;
  private readonly userRecordsEventsOff: (() => void)[] = [];
  get userRecords() {
    return this._userRecords;
  }
  set userRecords(value) {
    if (value == this._userRecords) {
      return;
    }

    value = value ?? null;

    const oldUserRecords = this._userRecords;
    const newUserRecord = value ?? null;
    this._userRecords = newUserRecord;

    // Clear previous events
    if (oldUserRecords != null) {
      this.userRecordsEventsOff.forEach((off) => {
        off();
      });
      this.userRecordsEventsOff.length = 0;
    }

    // Bind new events
    if (newUserRecord) {
      this.userRecordsEventsOff.push(
        newUserRecord.eventBus.on('recordsUpdated', () => {
          this._eventBus.emit('userRecordsUpdated', {
            userRecords: value,
          });
        }),
        newUserRecord.eventBus.on('filterNewestRecordIterable', (filter) => {
          this._eventBus.emit('userRecordsFilterNewestRecordIterable', filter);
        })
      );
    }

    this._history.serverRecords = newUserRecord;

    this._eventBus.emit('userRecordsUpdated', {
      userRecords: newUserRecord,
    });
  }

  private recordsBuffer: UnprocessedRecordsBuffer;

  private _history: CollabHistory;

  private _submittedRecord: SubmittedRecord | null = null;
  get submittedRecord() {
    return this._submittedRecord;
  }

  get headRevision() {
    return this.recordsBuffer.currentVersion;
  }

  get client(): Pick<CollabHistory, 'server' | 'submitted' | 'local' | 'view'> {
    return this._history;
  }

  get history(): Pick<
    CollabHistory,
    'undoableRecordsCount' | 'records' | 'serverTailRevision'
  > {
    return this._history;
  }

  get headText(): RevisionChangeset {
    return {
      revision: this.recordsBuffer.currentVersion,
      changeset: this._history.server,
    };
  }

  private _viewText: string | null = null;
  get viewText() {
    if (this._viewText === null) {
      this._viewText = this._history.view.joinInsertions();
    }
    return this._viewText;
  }

  static newFromHeadText: (headText: RevisionChangeset) => CollabService = (headText) => {
    return new CollabService(CollabService.headTextAsOptions(headText));
  };

  static headTextAsOptions: (headText: RevisionChangeset) => CollabServiceOptions = (
    headText
  ) => {
    return {
      recordsBuffer: {
        version: headText.revision,
      },
      history: {
        serverTailRecord: headText,
      },
    };
  };

  private readonly eventsOff: (() => void)[];

  constructor(options?: CollabServiceOptions) {
    this.logger = options?.logger;

    const headRevision =
      options?.recordsBuffer instanceof OrderedMessageBuffer
        ? options.recordsBuffer.currentVersion
        : (options?.recordsBuffer?.version ?? 0);

    this.eventsOff = [];

    this.generateSubmitId = options?.generateSubmitId ?? (() => nanoid(6));

    // Submitted record
    this._submittedRecord = options?.submittedRecord ?? null;

    // Buffered future records
    this.recordsBuffer =
      options?.recordsBuffer instanceof OrderedMessageBuffer
        ? options.recordsBuffer
        : new OrderedMessageBuffer({
            version: headRevision,
            ...options?.recordsBuffer,
            messageMapper: {
              struct: UnprocessedRecordStruct,
              version(message) {
                return message.record.revision;
              },
            },
          });
    this.eventsOff.push(
      this.recordsBuffer.eventBus.on('nextMessage', (message) => {
        if (message.type == 'SUBMITTED_ACKNOWLEDGED') {
          this._submittedRecord = null;
          this._history.submittedChangesAcknowledged({
            revision: message.record.revision,
            changeset: message.record.changeset,
          });
        } else {
          const submittedRecord = this._submittedRecord;
          // message.type === UnprocessedRecordType.EXTERNAL_CHANGE
          const event = this._history.handleExternalChange({
            revision: message.record.revision,
            changeset: message.record.changeset,
          });
          if (submittedRecord && event) {
            submittedRecord.processExternalChangeEvent(event);
          }
        }
      })
    );

    // Link events
    this._eventBus = options?.eventBus ?? mitt();

    // History for selection and local changeset
    this._history =
      options?.history instanceof CollabHistory
        ? options.history
        : new CollabHistory({
            logger: options?.logger?.extend('history'),
            ...options?.history,
            service: {
              eventBus: this._eventBus,
            },
          });
    this.eventsOff.push(
      this._history.eventBus.on('viewChanged', () => {
        this._viewText = null;
      })
    );

    // Records of a specific user
    this.userRecords = options?.userRecords ?? null;

    this.eventsOff.push(
      this._history.eventBus.on('*', ({ type, event }) => {
        if (type !== 'handledExternalChange') {
          this._eventBus.emit(type, event);
        } else {
          this._eventBus.emit(type, {
            ...event,
            revision: this.recordsBuffer.currentVersion,
          });
        }
      })
    );

    this.eventsOff.push(
      this.recordsBuffer.eventBus.on('nextMessage', (e) => {
        this._eventBus.emit('nextMessage', e);
      })
    );

    const processingBus = mitt<CollabServiceProcessingEvents>();
    this.eventsOff.push(
      this.recordsBuffer.eventBus.on('processingMessages', (e) => {
        e.eventBus.on('nextMessage', (e) => {
          processingBus.emit('nextMessage', e);
        });

        let hadExternalChanges = false;
        const externalChangePayloads: {
          event: CollabHistoryEvents['handledExternalChange'];
          revision: number;
        }[] = [];
        const unsubHandledExternalChange = this._history.eventBus.on(
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
            this._eventBus.emit('handledExternalChanges', externalChangePayloads);
          } finally {
            processingBus.all.clear();
            unsubHandledExternalChange();
          }
        });

        this._eventBus.emit('processingMessages', {
          eventBus: processingBus,
        });
      })
    );

    this.eventsOff.push(
      this.recordsBuffer.eventBus.on('messagesProcessed', () => {
        this._eventBus.emit('headRevisionChanged', {
          revision: this.headRevision,
          changeset: this._history.server,
        });
      })
    );

    this.eventsOff.push(
      this.recordsBuffer.eventBus.on('missingMessages', (e) => {
        this._eventBus.emit('missingRevisions', e);
      })
    );
  }

  /**
   * Removes event listeners from service. This instance becomes useless.
   */
  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }

  /**
   * Completely resets service state and clears all data.
   */
  reset() {
    this._history.reset();
    this.recordsBuffer.reset();

    this._eventBus.emit('headRevisionChanged', {
      revision: this.headRevision,
      changeset: this._history.server,
    });
    this._eventBus.emit('replacedHeadText', {
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

    this._history.reset({
      serverTailRecord: headText,
    });
    this.recordsBuffer.setVersion(headText.revision);

    this._eventBus.emit('headRevisionChanged', {
      revision: this.headRevision,
      changeset: this._history.server,
    });
    this._eventBus.emit('replacedHeadText', {
      headText: this.headText,
    });
  }

  getMissingRevisions() {
    return this.recordsBuffer.getMissingVersions();
  }

  haveSubmittedChanges() {
    return this._history.haveSubmittedChanges();
  }

  haveLocalChanges() {
    return this._history.haveLocalChanges();
  }

  haveChanges() {
    return this.haveSubmittedChanges() || this.haveLocalChanges();
  }

  canSubmitChanges() {
    return this._history.canSubmitChanges();
  }

  /**
   *
   * @returns Revision changeset that can be send to the server. Contains all
   * changes since last submission. Returns undefined if changes cannot be submitted.
   * Either due to existing submitted changes or no local changes exist.
   */
  submitChanges(): SubmittedRevisionRecord | undefined | null {
    if (this._history.submitChanges()) {
      const historySelection = this._history.getSubmitSelection();

      this._submittedRecord = new SubmittedRecord({
        ...historySelection,
        userGeneratedId: this.generateSubmitId(),
        revision: this.headRevision,
        changeset: this._history.submitted,
      });

      this._eventBus.emit('submittedRecord', { submittedRecord: this._submittedRecord });
    }

    return this._submittedRecord;
  }

  /**
   * Acknowledge submitted changes.
   */
  submittedChangesAcknowledged(record: CollabServiceRecord) {
    this.recordsBuffer.add({
      type: 'SUBMITTED_ACKNOWLEDGED',
      record: record,
    });
  }

  /**
   * Handles external change that is created by another client during
   * collab editing.
   */
  handleExternalChange(record: CollabServiceRecord) {
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
   * Restores up to {@link desiredRestoreCount} history records. Server records
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
    return this._userRecords?.hasOwnOlderRecords(this._history.serverTailRevision);
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

  serialize(historyKeepServerEntries = false) {
    return CollabServiceOptionsStruct.maskRaw({
      submittedRecord: this._submittedRecord,
      recordsBuffer: this.recordsBuffer.serialize(),
      history: this._history.serialize(historyKeepServerEntries),
    });
  }

  static parseValue(
    value: unknown
  ): Pick<CollabServiceOptions, 'submittedRecord' | 'recordsBuffer' | 'history'> {
    const options = CollabServiceOptionsStruct.create(value);

    return {
      ...options,
      submittedRecord: options.submittedRecord
        ? new SubmittedRecord(options.submittedRecord)
        : undefined,
    };
  }
}
