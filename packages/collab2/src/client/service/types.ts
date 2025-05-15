import { Emitter } from 'mitt';
import { Logger } from '../../../../utils/src/logging';
import { Changeset } from '../../common/changeset';
import { ServerRecord, SubmittedRecord, HeadRecord } from '../../server';
import { MutableComputedState } from './computed-state';
import { TextRecord } from '../../server/types';
import { ServerFacades } from './utils/server-facades';

/**
 * Per-instance properties
 */
export interface Properties {
  /**
   * Class that holds all state for service with computed properties
   */
  readonly state: MutableComputedState;

  /**
   * Context is shareable between instances and can be modified on demand
   */
  readonly context: Context;

  /**
   * Server facades enable service to undo server records not in local history stack.
   */
  readonly serverFacades: ServerFacades;
}

export interface State {
  /**
   * Stores original edits. When undo, inverse is applied to view
   * and this record is moved to {@link redoStack}
   */
  readonly undoStack: readonly HistoryServiceRecord[];

  /**
   * Indexes of undoStack that contains history record type `server`
   */
  readonly undoStackTypeServerIndexes: readonly number[];

  /**
   * Stores edits that were undone.
   * When redo, original edit is applied and then this record is moved back to {@link undoStack}
   */
  readonly redoStack: readonly HistoryServiceRecord[];

  /**
   * All records in {@link undoStack} and {@link redoStack} has {@link viewIndex} offset by {@link viewIndexOffset}
   * whenever older unused {@link viewChanges} are deleted.
   */
  readonly viewIndexOffset: number;

  /**
   * Composition of all local changes so far.
   */
  readonly localRecord: LocalServiceRecord | null;

  /**
   * Current record that is submitted to server.
   */
  readonly submittedRecord: SubmittedServiceRecord | null;

  /**
   * Revision of composed {@link serverText}
   */
  readonly serverRevision: number;
  /**
   * Server text that this Service is up-to-date with
   */
  readonly serverText: Changeset;

  /**
   * View displayed to user. Is compsition of serverText * submittedRecord * localChanges
   */
  readonly viewText: Changeset;

  /**
   * All changesets that make up {@link viewText}.
   */
  readonly viewChanges: readonly ViewRecord[];

  /**
   * Latest view revision. Only used to identify viewChanges locally..
   */
  readonly viewRevision: number;

  /**
   * Recipes cannot return values so this is a temporary buffer of return values.
   * These values are needed by eventBus to emit events correctly.
   *
   * This object is not serialized.
   */
  readonly tmpRecipeResults: {
    /**
     * After processing external typing, a changeset is produced
     * that can be composed on previous view to get new view including the external typing.
     */
    readonly externalTypings: readonly ExternalTypingRecord[];
    /**
     * Recently applied local typings, from addLocalTyping, undo or redo
     */
    readonly localTypings: readonly LocalTypingRecord[];
  };

  /**
   * Messages received from server that need to be processed.
   * Queue gets filled only when receiving message from server out of order.
   * Is always sorted by revision.
   */
  readonly messagesQueue: IncomingServerMessage[];
  /**
   * Cannot process current next message in {@link messagesQueue} until have received
   * all revisions in range [start, end)
   */
  readonly missingMessageRevisions: {
    readonly startRevision: number;
    readonly endRevision: number;
  } | null;
}

/**
 * Options that can be shared between instances and modified at runtime
 */
export interface Context {
  readonly logger?: Logger;
  /**
   * Generate id for SubmittedRecord that's sent to server.
   * Must be unique for past few records.
   * @default nanoid(6)
   */
  readonly generateSubmitId: () => string;

  /**
   * Decide whether to make external typing part of history
   * @default () => false
   */
  readonly isExternalTypingHistory: (record: ServiceServerRecord) => boolean;

  /**
   * How many history records are stored at most.
   * If limit exceeded then older records are deleted from undo stack.
   * @default 100
   */
  readonly historySizeLimit: number;

  /**
   * When deleting items from array, wait until deletion count reaches this value before proceeding with deletion.
   * @default 32
   */
  readonly arrayCleanupThreshold: number;

  readonly serializer: Serializer;
}

interface BaseViewRecord {
  /**
   * Unique revision for a given view.
   */
  readonly viewRevision: number;
}

export type LocalTypingRecord = Pick<ServerRecord, 'changeset' | 'selection'> &
  BaseViewRecord;

export type ExternalTypingRecord = Pick<ServerRecord, 'changeset'> & BaseViewRecord;

export type ViewRecord = Pick<ServerRecord, 'changeset' | 'inverse'> & BaseViewRecord;

export interface ViewHistoryServiceRecord
  extends Pick<ServerRecord, 'changeset' | 'inverse' | 'selectionInverse' | 'selection'> {
  readonly type: 'view';
  /**
   * Index in viewChanges that stores this {@link changeset}
   */
  readonly viewIndex: number;
  /**
   * Must adjust to these external changes before record can be applied on view.
   */
  readonly externalChanges: readonly Changeset[];
}

/**
 * Apply history record by server revision.
 */
export interface ServerHistoryServiceRecord {
  readonly type: 'server';
  /**
   * Revision of server record to be restored
   */
  readonly revision: number;
  /**
   * Records are restored until (including) this revision.
   * Set true to restore until very first server available record.
   * Only when undoing.
   */
  readonly untilRevision?: number | true;
}

export type HistoryServiceRecord = ViewHistoryServiceRecord | ServerHistoryServiceRecord;

export type LocalServiceRecord = Pick<
  ServerRecord,
  'changeset' | 'selectionInverse' | 'selection'
>;

export type SubmittedServiceRecord = Pick<
  SubmittedRecord,
  'id' | 'targetRevision' | 'changeset' | 'selectionInverse' | 'selection'
>;

/**
 * HeadRecord that's compatible with the service
 */
export type ServiceHeadRecord = Pick<HeadRecord, 'revision' | 'text'>;

/**
 * ServerRecord that's compatible with the Service
 */
export type ServiceServerRecord = Pick<
  ServerRecord,
  'revision' | 'authorId' | 'changeset' | 'selectionInverse' | 'selection'
>;

export interface IncomingServerMessage {
  readonly type: 'local-typing-acknowledged' | 'external-typing';
  readonly item: ServiceServerRecord;
}

/**
 * A simplified interface/facade to access/query data from server.
 *
 */
export interface ServerFacade {
  on: Emitter<ServerFacadeEvents>['on'];

  off: Emitter<ServerFacadeEvents>['off'];

  head(): HeadRecord | undefined;

  /**
   * @returns Text at revision.
   */
  text(targetRevision: number): TextRecord | undefined;

  /**
   *
   * @param startRevision
   * @param endRevision Is exclusive
   */
  range(startRevision: number, endRevision: number): readonly ServerRecord[];

  /**
   * Get record at {@link revision} or null if it's not available
   * @param revision
   */
  at(revision: number): ServerRecord | undefined;

  /**
   * Iterable that returns records starting at {@link startRevision} until oldest cached record.
   *
   * @param startRevision First returned revision
   */
  olderIterable(startRevision: number): Iterable<ServerRecord>;

  /**
   * @returns true if server has more records before {@link revision}.
   */
  hasOlderThan(revision: number): boolean;
}

export interface ServerFacadeEvents {
  /**
   * headText has updated to a newer revision.
   */
  'head:updated': {
    readonly facade: ServerFacade;
    readonly headRecord: HeadRecord;
  };

  /**
   * More records might be available.
   */
  'records:updated': {
    readonly facade: ServerFacade;
  };
}

export type SerializedState = unknown;

export interface Serializer {
  /**
   * Serialize state into JSON compatible format
   */
  serialize(state: State): SerializedState;

  /**
   * Parse serialized state to be used by Service
   */
  deserialize(serializedState: SerializedState): State;
}
