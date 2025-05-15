import mitt, { Emitter, PickReadEmitter, ReadEmitter } from 'mitt';
import {
  array,
  assign,
  coerce,
  enums,
  Infer,
  literal,
  number,
  object,
  omit,
  optional,
  union,
  unknown,
} from 'superstruct';

import { Logger } from '../../../utils/src/logging';

import { Maybe, ReadonlyDeep } from '../../../utils/src/types';

import { Changeset, ChangesetStruct, InsertStrip } from '../changeset';
import { CollabServiceEvents } from '../client/collab-service';
import {
  OptionalSelectionRange,
  SelectionRange,
  SelectionRangeStruct,
} from '../client/selection-range';
import { UserRecords } from '../client/user-records';
import {
  RevisionChangeset,
  RevisionChangesetStruct,
  SubmittedRevisionRecord,
} from '../records/record';
import {
  SimpleTextOperationOptions,
  SelectionChangeset,
  ServerRecordsFacade,
} from '../types';

import { swapChangesets } from '../changeset/swap-changesets';
import { isDefined } from '../../../utils/src/type-guards/is-defined';

export interface CollabHistoryEvents {
  viewChanged: Readonly<{
    /**
     * New view changeset.
     */
    view: Changeset;

    /**
     * Changeset that was just composed on view.
     * If undefined then view was completely replaced.
     */
    change?: Changeset;

    /**
     * What caused view to change. Either external or local change.
     */
    source: ChangeSource;
  }>;
  haveLocalChanges: Readonly<{
    /**
     * Local changes
     */
    local: Changeset;
  }>;
  submitChanges?: never;
  submittedChangesAcknowledged?: never;
  handledExternalChange: Readonly<{
    /**
     * External change
     */
    externalChange: Changeset;
    /**
     * Changeset that will be composed on view
     */
    viewComposable: Changeset;
    /**
     * State before the change
     */
    before: Readonly<Pick<CollabHistory, 'server' | 'submitted' | 'local' | 'view'>>;
    /**
     * State after the change
     */
    after: Readonly<Pick<CollabHistory, 'server' | 'submitted' | 'local' | 'view'>>;
  }>;

  appliedTypingOperation: ReadonlyDeep<
    {
      operation: Operation;
    },
    Changeset
  >;
  appliedUndo: ReadonlyDeep<
    {
      operation: Operation;
    },
    Changeset
  >;
  appliedRedo: ReadonlyDeep<
    {
      operation: Operation;
    },
    Changeset
  >;
  addedTailRecords: ReadonlyDeep<{
    /**
     * Count of added records. Can undo that many more times.
     */
    count: number;
  }>;
}

export enum ChangeSource {
  LOCAL = 'local',
  EXTERNAL = 'external',
  RESET = 'reset',
}

const ServerRecordStruct = RevisionChangesetStruct;

const ServerTailRecordStruct = RevisionChangesetStruct;

const HistoryRecordStruct = object({
  type: enums(['execute', 'permanent', 'undo', 'redo']),
  squash: optional(literal(true)),
  changeset: ChangesetStruct,
  beforeSelection: SelectionRangeStruct,
  afterSelection: SelectionRangeStruct,
  serverRecord: optional(ServerRecordStruct),
});

const ExpandedHistoryRecordArrayStruct = array(HistoryRecordStruct);

const CollapsedHistoryRecordArrayStruct = array(
  assign(
    omit(HistoryRecordStruct, ['beforeSelection']),
    omit(HistoryRecordStruct, ['afterSelection']),
    object({
      beforeSelection: OptionalSelectionRange,
      afterSelection: OptionalSelectionRange,
    })
  )
);

// Removes beforeSelection if it matched previous record afterSelection
export const HistoryRecordArrayStruct = coerce(
  ExpandedHistoryRecordArrayStruct,
  unknown(),
  (unknownRecords) => {
    const collapsedRecords = CollapsedHistoryRecordArrayStruct.create(unknownRecords);
    return collapsedRecords.map((record, index) => {
      if (!record.afterSelection) {
        return {
          ...record,
          beforeSelection: SelectionRange.EMPTY,
          afterSelection: SelectionRange.EMPTY,
        };
      }

      const previousRecord = collapsedRecords[index - 1];

      if (!record.beforeSelection) {
        return {
          ...record,
          beforeSelection: previousRecord?.afterSelection ?? SelectionRange.from(0),
        };
      }

      return record;
    });
  },
  (expandedRecords) => {
    return CollapsedHistoryRecordArrayStruct.createRaw(
      expandedRecords.map((record, index) => {
        if (
          SelectionRange.isEmpty(record.beforeSelection) &&
          SelectionRange.isEmpty(record.afterSelection)
        ) {
          return {
            type: record.type,
            changeset: record.changeset,
            ...(record.squash && { squash: record.squash }),
            ...(record.serverRecord && { serverRecord: record.serverRecord }),
          };
        }

        const previousRecord = expandedRecords[index - 1];
        if (previousRecord) {
          if (
            SelectionRange.isEqual(previousRecord.afterSelection, record.beforeSelection)
          ) {
            return {
              type: record.type,
              changeset: record.changeset,
              afterSelection: record.afterSelection,
              ...(record.squash && { squash: record.squash }),
              ...(record.serverRecord && { serverRecord: record.serverRecord }),
            };
          }
        }

        return record;
      })
    );
  }
);

const LastExecutedIndexStruct = object({
  server: number(),
  submitted: number(),
  execute: number(),
});

// TODO allow undefined?
const ServerToLocalHistoryTransform = union([ChangesetStruct, literal(null)]);

export const CollabHistoryOptionsStruct = object({
  serverTailRecord: ServerTailRecordStruct,
  serverToLocalHistoryTransform: ServerToLocalHistoryTransform,
  records: HistoryRecordArrayStruct,
  lastExecutedIndex: LastExecutedIndexStruct,
});

interface Operation {
  changeset: Changeset;
  selection: SelectionRange;
}

export type HistoryRecord = Infer<typeof HistoryRecordStruct>;

export type ReadonlyHistoryRecord = ReadonlyDeep<HistoryRecord, Changeset>;

interface ChangesetRecord {
  readonly changeset: Changeset;
}

type ServerRecord = Readonly<Infer<typeof ServerRecordStruct>>;

type ServerTailRecord = Readonly<Infer<typeof ServerTailRecordStruct>>;

type LastExecutedIndex = Infer<typeof LastExecutedIndexStruct>;

class CollabHistoryTransactionError extends Error {
  //
}

export interface CollabHistoryOptions {
  logger?: Logger;
  eventBus?: Emitter<CollabHistoryEvents>;
  service?: {
    eventBus: PickReadEmitter<CollabServiceEvents, 'handledExternalChange'>;
  };
  client?: {
    server?: Changeset;
    submitted?: Changeset;
    local?: Changeset;
    view?: Changeset;
  };
  serverTailRecord?: ServerTailRecord;
  serverToLocalHistoryTransform?: Maybe<Changeset>;
  records?: ReadonlyHistoryRecord[];
  lastExecutedIndex?: LastExecutedIndex;
}

function oppositeType(type: 'undo'): 'redo';
function oppositeType(type: 'redo'): 'undo';
function oppositeType(type: 'undo' | 'redo'): 'undo' | 'redo';
function oppositeType(type: string) {
  return type === 'redo' ? 'undo' : 'redo';
}

export class CollabHistory {
  private readonly logger;

  private readonly _eventBus: Emitter<CollabHistoryEvents>;
  get eventBus(): ReadEmitter<CollabHistoryEvents> {
    return this._eventBus;
  }

  private serverTailRecord: ServerTailRecord;

  private serverToLocalHistoryTransform: Changeset;

  private _records: ReadonlyHistoryRecord[];

  get records(): readonly ReadonlyHistoryRecord[] {
    return this._records;
  }

  get serverTailRevision() {
    return this.serverTailRecord.revision;
  }

  get undoableRecordsCount() {
    return this._records
      .slice(0, this.lastExecutedIndex.execute + 1)
      .reduce((sum, p) => sum + (p.type === 'execute' ? 1 : 0), 0);
  }

  private lastExecutedIndex: LastExecutedIndex;

  public serverRecords: Pick<
    ServerRecordsFacade<{
      changeset: Changeset;
    }>,
    'getTextAtMaybe'
  > | null = null;

  private readonly eventsOff: (() => void)[];

  constructor(options?: CollabHistoryOptions) {
    this.logger = options?.logger;

    this._eventBus = options?.eventBus ?? mitt();

    this.serverTailRecord = {
      changeset: Changeset.EMPTY,
      revision: 0,
    };
    this.serverToLocalHistoryTransform = this.serverTailRecord.changeset.getIdentity();

    // TODO memoize records... using composition
    this._records = [];

    this.lastExecutedIndex = {
      server: -1,
      submitted: -1,
      execute: -1,
    };

    this.withTransaction('constructor', () => {
      if (!options) {
        return;
      }
      if (options.serverTailRecord) {
        this.serverTailRecord = options.serverTailRecord;
      }

      if (options.serverToLocalHistoryTransform) {
        this.serverToLocalHistoryTransform = options.serverToLocalHistoryTransform;
      } else if (options.serverTailRecord) {
        this.serverToLocalHistoryTransform =
          this.serverTailRecord.changeset.getIdentity();
      }

      if (options.records) {
        this._records = options.records;
      }

      if (options.lastExecutedIndex) {
        this.lastExecutedIndex = options.lastExecutedIndex;
      }
    });
  }

  reset(options?: Pick<CollabHistoryOptions, 'serverTailRecord'>) {
    this.withTransaction('reset', () => {
      this.serverTailRecord = options?.serverTailRecord ?? {
        changeset: Changeset.EMPTY,
        revision: 0,
      };
      this.serverToLocalHistoryTransform = this.serverTailRecord.changeset.getIdentity();
      this._records = [];

      this.lastExecutedIndex = {
        server: -1,
        submitted: -1,
        execute: -1,
      };

      this._eventBus.emit('viewChanged', {
        view: this.view,
        change: this.server,
        source: ChangeSource.RESET,
      });
    });
  }

  /**
   * Removes event listeners from client. This instance becomes useless.
   */
  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }

  private isTransactionInProgress = false;
  private startTransaction(name: string) {
    if (this.isTransactionInProgress) {
      throw new CollabHistoryTransactionError('Transaction already in progress');
    }
    this.isTransactionInProgress = true;

    let isThisTransactionDone = false;

    this.logState(`transaction:start:${name}`);

    const savedState = {
      serverTailRecord: this.serverTailRecord,
      serverToLocalHistoryTransform: this.serverToLocalHistoryTransform,
      records: [...this.records],
      lastExecutedIndex: { ...this.lastExecutedIndex },
    };

    const disposeTransaction = () => {
      if (isThisTransactionDone) {
        return;
      }
      isThisTransactionDone = true;

      this.isTransactionInProgress = false;
    };

    const rollbackTransaction = () => {
      if (isThisTransactionDone) {
        return;
      }
      disposeTransaction();

      this.logState(`transaction:rollback:${name}`);
      this.serverTailRecord = savedState.serverTailRecord;
      this.serverToLocalHistoryTransform = savedState.serverToLocalHistoryTransform;
      this._records = savedState.records;
      this.lastExecutedIndex = savedState.lastExecutedIndex;
      this.logState(`transaction:rollback:completed:${name}`);
    };

    return {
      completeTransaction: () => {
        if (isThisTransactionDone) {
          return;
        }

        try {
          Object.keys(this.lastExecutedIndex).forEach((key) => {
            if (
              this.lastExecutedIndex[key as keyof LastExecutedIndex] < -1 ||
              this.lastExecutedIndex[key as keyof LastExecutedIndex] >=
                this.records.length
            ) {
              throw new Error(`lastExecutedIndex.${key} is out of bounds`);
            }
          });

          if (this.lastExecutedIndex.server > this.lastExecutedIndex.submitted) {
            throw new Error(
              `Server index ${this.lastExecutedIndex.server} ` +
                `is greater than submitted index ${this.lastExecutedIndex.submitted}`
            );
          }

          if (this.tailText.hasRetainStrips()) {
            throw new Error(
              `TailText contains retain strips ${this.tailText.toString()}`
            );
          }

          const localRecords = [
            this.serverTailRecord.changeset,
            this.serverToLocalHistoryTransform,
            ...this._records.map((r) => r.changeset),
          ];
          for (let i = 1; i < localRecords.length; i++) {
            const r0 = localRecords[i - 1];
            const r1 = localRecords[i];
            if (!r0 || !r1) {
              continue;
            }
            try {
              r0.assertIsComposable(r1);
            } catch (err) {
              throw new Error('Local records are not composable', {
                cause: err,
              });
            }
          }

          const serverRecrods = [
            this.serverTailRecord,
            ...this._records.map((r) => r.serverRecord).filter(isDefined),
          ];
          for (let i = 1; i < serverRecrods.length; i++) {
            const r0 = serverRecrods[i - 1];
            const r1 = serverRecrods[i];
            if (!r0 || !r1) {
              continue;
            }
            try {
              r0.changeset.assertIsComposable(r1.changeset);
            } catch (err) {
              throw new Error('Server records are not composable', {
                cause: err,
              });
            }
            if (r0.revision >= r1.revision) {
              throw new Error(
                `Revision is out of order. Revision ${r0.revision} appears after ${r1.revision}`
              );
            }
          }

          this.logState(`transaction:completed:${name}`);
          disposeTransaction();
        } catch (err) {
          this.logger?.error(`transaction:error:${name}`, err);
          rollbackTransaction();
          throw new CollabHistoryTransactionError(
            `Attemplted illegal modification${err instanceof Error ? `: ${err.message}` : ''}`,
            {
              cause: err,
            }
          );
        }
      },
      rollbackTransaction,
    };
  }

  private withTransaction<TReturn>(name: string, fn: () => TReturn): TReturn | undefined {
    if (this.isTransactionInProgress) {
      return fn();
    }

    const tsx = this.startTransaction(name);
    try {
      const result = fn();
      tsx.completeTransaction();
      return result;
    } finally {
      tsx.rollbackTransaction();
    }
  }

  private getTextAt(index: number) {
    // slice.[0, index + 1)
    const records: ChangesetRecord[] = this.records.slice(0, index + 1);
    if (records.length === 0) {
      return this.tailText;
    }

    return records.reduce((a, b) => a.compose(b.changeset), this.tailText);
  }

  private get tailText(): Changeset {
    return [this.serverTailRecord.changeset, this.serverToLocalHistoryTransform].reduce(
      (a, b) => a.compose(b),
      Changeset.EMPTY
    );
  }

  get server(): Changeset {
    if (this.lastExecutedIndex.server === -1) {
      return this.tailText;
    }

    // slice.[0, server + 1)
    const records: ChangesetRecord[] = this.records.slice(
      0,
      this.lastExecutedIndex.server + 1
    );
    if (records.length === 0) {
      return this.tailText;
    }

    return records.reduce((a, b) => a.compose(b.changeset), this.tailText);
  }

  get submitted(): Changeset {
    if (this.lastExecutedIndex.submitted === -1) {
      return this.server.getIdentity();
    }

    // slice.[server + 1, submitted + 1)
    const records: ChangesetRecord[] = this._records.slice(
      this.lastExecutedIndex.server + 1,
      this.lastExecutedIndex.submitted + 1
    );
    if (records.length === 0) {
      return this.server.getIdentity();
    }

    return records.reduce((a, b) => ({
      changeset: a.changeset.compose(b.changeset),
    })).changeset;
  }

  get local(): Changeset {
    if (this.records.length === 0) {
      return this.submitted.getIdentity();
    }

    // slice.[submitted + 1,...)
    const records: ChangesetRecord[] = this._records.slice(
      this.lastExecutedIndex.submitted + 1
    );

    if (records.length === 0) {
      return this.submitted.getIdentity();
    }

    return records.reduce((a, b) => ({
      changeset: a.changeset.compose(b.changeset),
    })).changeset;
  }

  get view(): Changeset {
    // slice.[0,...)
    const records: ChangesetRecord[] = this._records;
    if (records.length === 0) {
      return this.tailText;
    }

    return records.reduce((a, b) => a.compose(b.changeset), this.tailText);
  }

  get submittedView(): Changeset {
    if (this.lastExecutedIndex.submitted === -1) {
      return this.server.getIdentity();
    }

    // slice.[0, submitted + 1)
    const records: ChangesetRecord[] = this._records.slice(
      0,
      this.lastExecutedIndex.submitted + 1
    );
    if (records.length === 0) {
      return this.tailText;
    }

    return records.reduce((a, b) => a.compose(b.changeset), this.tailText);
  }

  /**
   *
   * @returns After and before selection that will match `client.submitted`
   */
  getSubmitSelection(): Pick<
    SubmittedRevisionRecord,
    'afterSelection' | 'beforeSelection'
  > {
    const oldestLocalRecord = this._records[this.lastExecutedIndex.server + 1];
    const newestLocalRecord = this._records[this._records.length - 1];
    if (!oldestLocalRecord || !newestLocalRecord) {
      return {
        beforeSelection: SelectionRange.EMPTY,
        afterSelection: SelectionRange.EMPTY,
      };
    }

    return {
      beforeSelection: oldestLocalRecord.beforeSelection,
      afterSelection: newestLocalRecord.afterSelection,
    };
  }

  haveSubmittedChanges() {
    // return !this.submitted.isIdentity(this.server);
    return this.lastExecutedIndex.server !== this.lastExecutedIndex.submitted;
  }

  /**
   * Have local changes when submitting it changes server text visually
   */
  haveLocalChanges() {
    const uniqueLocal = this.submittedView.insertionsToRetained(this.local);

    return !uniqueLocal.isIdentity(this.submitted);
  }

  canSubmitChanges() {
    return !this.haveSubmittedChanges() && this.haveLocalChanges();
  }

  /**
   *
   * @returns Submitting changes was successful and submittable changes are in
   * {@link submitted}. Returns false if previous submitted changes exist or
   * there are no local changes to submit.
   */
  submitChanges() {
    if (!this.canSubmitChanges()) return false;

    this.lastExecutedIndex.submitted = this._records.length - 1;

    this._eventBus.emit('submitChanges');

    return true;
  }

  private cacheServerRecords(targetIndex: number, ...serverRecords: ServerRecord[]) {
    const targetRecord = this._records[targetIndex];
    if (!targetRecord) {
      return;
    }

    const concatServerRecords = [
      ...(targetRecord.serverRecord ? [targetRecord.serverRecord] : []),
      ...serverRecords,
    ];
    const firstServerRecord = concatServerRecords[0];
    if (!firstServerRecord) {
      return;
    }

    this._records[targetIndex] = {
      ...targetRecord,
      serverRecord: concatServerRecords.slice(1).reduce(
        (a, b) => ({
          revision: b.revision,
          changeset: a.changeset.compose(b.changeset),
        }),
        firstServerRecord
      ),
    };
  }

  /**
   * Can acknowledge only if submitted changes exist.
   * @returns Acknowlegement successful. Only returns false if submitted changes don't exist.
   */
  submittedChangesAcknowledged(record: RevisionChangeset) {
    if (!this.haveSubmittedChanges()) return false;

    this.logger?.debug('submittedChangesAcknowledged', record);
    const transactionResult = this.withTransaction('submittedChangesAcknowledged', () => {
      this.cacheServerRecords(this.lastExecutedIndex.submitted, record);

      this.lastExecutedIndex.server = this.lastExecutedIndex.submitted;
      this.recordsCleanup(-1, this.lastExecutedIndex.server);
      return true;
    });

    if (transactionResult) {
      this._eventBus.emit('submittedChangesAcknowledged');
    }

    return true;
  }

  /**
   * Composes external change to server changeset and updates rest accordingly to match server.
   *
   * A - server, X - submitted, Y - local, B - external \
   * V - view, D - external change relative to view \
   * Text before external change: AXY = V \
   * Text after external change: A'BX'Y' = VD \
   * A' = AB \
   * X' = f(B,X) \
   * Y' = f(f(X,B),Y) \
   * D =  f(Y,f(X,B)) \
   * V' = VD
   */
  handleExternalChange(
    externalRecord: RevisionChangeset
  ): CollabHistoryEvents['handledExternalChange'] | undefined {
    const before = {
      server: this.server,
      submitted: this.submitted,
      local: this.local,
      view: this.view,
    };

    // TODO remember record revision so that tail can be moved

    this.logger?.debug('handleExternalChange', externalRecord);

    const transactionResult = this.withTransaction('handleExternalChange', () => {
      this._records.splice(this.lastExecutedIndex.server + 1, 0, {
        type: 'permanent',
        beforeSelection: SelectionRange.EMPTY,
        afterSelection: SelectionRange.EMPTY,
        changeset: externalRecord.changeset,
        serverRecord: externalRecord,
      });

      this.movePermanentChangesToLocalHistoryTransform(
        -1,
        this.lastExecutedIndex.server + 2,
        'between'
      );

      this.logState(
        `handleExternalState:follow:[${this.lastExecutedIndex.server + 1},${this._records.length})`
      );
      let followChangeset = externalRecord.changeset;
      for (let i = this.lastExecutedIndex.server + 1; i < this._records.length; i++) {
        const record = this._records[i];
        if (!record) {
          continue;
        }

        const nextFollowChangeset = record.changeset.follow(followChangeset);

        const leftBeforeStartStrip = followChangeset.strips.at(
          record.beforeSelection.start
        );
        const rightBeforeStartStrip = record.changeset.strips.at(
          record.beforeSelection.start
        );

        const beforeSelectionChangeset =
          leftBeforeStartStrip instanceof InsertStrip &&
          rightBeforeStartStrip instanceof InsertStrip &&
          rightBeforeStartStrip.value < leftBeforeStartStrip.value
            ? nextFollowChangeset
            : followChangeset;

        this._records[i] = {
          ...record,
          changeset: followChangeset.follow(record.changeset),
          beforeSelection: SelectionRange.closestRetainedPosition(
            record.beforeSelection,
            // followChangeset
            beforeSelectionChangeset
          ),
          afterSelection: SelectionRange.closestRetainedPosition(
            record.afterSelection,
            nextFollowChangeset
          ),
        };

        followChangeset = nextFollowChangeset;
      }

      this.deleteIdentityRecords(-1, this.lastExecutedIndex.server);

      this.deleteIdentityRecords(
        this.lastExecutedIndex.submitted + 1,
        this._records.length
      );

      return {
        viewComposable: followChangeset,
      };
    });

    if (transactionResult) {
      const { viewComposable } = transactionResult;
      const event: CollabHistoryEvents['handledExternalChange'] = {
        externalChange:
          externalRecord instanceof Changeset ? externalRecord : externalRecord.changeset,
        viewComposable,
        before,
        after: {
          server: this.server,
          submitted: this.submitted,
          local: this.local,
          view: this.view,
        },
      };

      this._eventBus.emit('handledExternalChange', event);

      this._eventBus.emit('viewChanged', {
        view: this.view,
        change: viewComposable,
        source: ChangeSource.EXTERNAL,
      });

      return event;
    }

    return;
  }

  /**
   * Introduce new local typing by composing {@link change} to
   * local changeset.
   */
  pushSelectionChangeset(
    value: SelectionChangeset,
    options?: SimpleTextOperationOptions
  ) {
    if (this.local.isEqual(this.local.compose(value.changeset))) {
      // Record doesn't make visual difference.
      return;
    }

    const type = options?.type;

    this.logger?.debug('pushSelectionChangeset', {
      value,
      options,
    });

    const beforeHaveLocalChanges = this.haveLocalChanges();

    const transactionResult = this.withTransaction('pushSelectionChangeset', () => {
      const newestRecord = this._records.at(this._records.length - 1);

      const record: HistoryRecord = {
        type: type === 'permanent' ? 'permanent' : 'execute',
        changeset: value.changeset,
        afterSelection: value.afterSelection,
        beforeSelection:
          value.beforeSelection ?? newestRecord?.afterSelection ?? SelectionRange.from(0),
      };
      if (type === 'merge') {
        record.squash = true;
      }

      this._records.push(record);

      this.lastExecutedIndex.execute = this._records.length - 1;

      this.recordsCleanup(this.lastExecutedIndex.submitted + 1, this._records.length);

      return {
        operation: {
          changeset: value.changeset,
          selection: value.afterSelection,
        },
      };
    });

    if (transactionResult) {
      // Transaction was successful
      this._eventBus.emit('viewChanged', {
        view: this.view,
        change: value.changeset,
        source: ChangeSource.LOCAL,
      });

      this._eventBus.emit('appliedTypingOperation', {
        operation: transactionResult.operation,
      });

      if (!beforeHaveLocalChanges && this.haveLocalChanges()) {
        this._eventBus.emit('haveLocalChanges', { local: this.local });
      }
    }
  }

  restoreFromUserRecords(
    userRecords: UserRecords,
    desiredRestoreCount: number,
    skipRecursive = false,
    depth = 0
  ): number | undefined {
    if (desiredRestoreCount <= 0) return 0;

    this.logState('sliceOlderRecordsUntilDesiredOwnCount', {
      revision: this.serverTailRecord.revision,
      desiredRestoreCount,
    });
    const { records: relevantRecords, ownCount: potentialRestoreCount } =
      userRecords.sliceOlderRecordsUntilDesiredOwnCount(
        this.serverTailRecord.revision,
        desiredRestoreCount
      );

    const firstRecord = relevantRecords[0];
    if (!firstRecord) return;

    const newServerTailRecord = userRecords.getTextAt(firstRecord.revision - 1);

    this.logger?.debug('restoreFromUserRecords', {
      newServerTailRecord,
      relevantRecords,
    });

    const transactionResult = this.withTransaction('restoreFromUserRecords', () => {
      const beforeRecordsCount = this._records.length;

      this._records.splice(
        0,
        0,
        ...relevantRecords.map<ReadonlyHistoryRecord>((record) => {
          const isOtherUserRecord = !userRecords.isOwnRecord(record);
          if (!record.beforeSelection || !record.afterSelection || isOtherUserRecord) {
            return {
              type: 'permanent' as const,
              changeset: record.changeset,
              beforeSelection: SelectionRange.EMPTY,
              afterSelection: SelectionRange.EMPTY,
              serverRecord: {
                revision: record.revision,
                changeset: record.changeset,
              },
            };
          } else {
            return {
              type: 'execute' as const,
              changeset: record.changeset,
              afterSelection: record.afterSelection,
              beforeSelection: record.beforeSelection,
              serverRecord: {
                revision: record.revision,
                changeset: record.changeset,
              },
            };
          }
        }),
        {
          type: 'permanent',
          changeset: this.serverToLocalHistoryTransform,
          beforeSelection: SelectionRange.EMPTY,
          afterSelection: SelectionRange.EMPTY,
        }
      );

      this.serverTailRecord = newServerTailRecord;
      this.serverToLocalHistoryTransform = this.serverTailRecord.changeset.getIdentity();

      this.movePermanentChangesToLocalHistoryTransform(
        -1,
        relevantRecords.length + 1,
        false,
        true
      );

      this.deleteIdentityRecords(
        -1,
        Math.min(this.lastExecutedIndex.server, relevantRecords.length)
      );

      const addedRecordsCount = this._records.length - beforeRecordsCount;

      this.lastExecutedIndex.server += addedRecordsCount;
      this.lastExecutedIndex.submitted += addedRecordsCount;
      this.lastExecutedIndex.execute += addedRecordsCount;

      return {
        addedRecordsCount,
      };
    });

    if (transactionResult === undefined) {
      return;
    }

    const { addedRecordsCount } = transactionResult;

    let restoredCount = addedRecordsCount;

    const remainingCount = desiredRestoreCount - restoredCount;
    if (remainingCount > 0 && potentialRestoreCount > 0 && !skipRecursive) {
      const nextRestoredCount = this.restoreFromUserRecords(
        userRecords,
        remainingCount,
        skipRecursive,
        depth + 1
      );
      if (typeof nextRestoredCount === 'number') {
        restoredCount += nextRestoredCount;
      }
    }

    if (depth === 0 && restoredCount > 0) {
      this._eventBus.emit('addedTailRecords', {
        count: restoredCount,
      });
    }

    return restoredCount;
  }

  /**
   * Removes reduntant records from history. For example undo redo pairs.
   * @param start Start index
   * @param end End index is exclusive
   */
  private recordsCleanup(start: number, end: number) {
    this.logger?.debug(`redoUndoCleanup:[${start},${end})`);
    this.withTransaction('redoUndoCleanup', () => {
      this.deleteUndoRedoStacks(start, end);

      this.deleteExecuteUndoStacks(start, end);

      this.squashRecords(start, end);

      this.movePermanentChangesToLocalHistoryTransform(start, end);

      this.deleteIdentityRecords(start, end);
    });
  }

  /**
   * Delete undo/redo stacks (U*...*U*R*...*R) or (R*...*R*U*...*U)
   * @param start
   * @param end Is exclusive
   */
  private deleteUndoRedoStacks(start: number, end: number) {
    let state: 'searching' | 'in-stack' = 'searching';
    let stackType: 'redo' | 'undo' = 'redo';
    let stackCount = 0;
    let deleteCount = 0;

    for (let i = end; i >= start; i--) {
      const record = this._records[i];
      if (!record) {
        continue;
      }

      if (state === 'searching') {
        if (record.type === 'undo' || record.type === 'redo') {
          state = 'in-stack';
          stackType = record.type;
          stackCount = 1;
        }
      } else {
        // in stack
        if (record.type === stackType) {
          stackCount++;
        } else if (record.type === oppositeType(stackType)) {
          stackCount--;
          deleteCount += 2;

          if (stackCount === 0) {
            // undoCount === 0
            // Found deletable undo stack
            if (deleteCount > 0) {
              const deleteStart = i;
              const deleteEnd = deleteStart + deleteCount;
              for (let j = deleteEnd - 1; j >= deleteStart; j--) {
                this.copyServerRecordToExecute(j);
                this.removedRecordAtIndex(j);
              }
              this._records.splice(deleteStart, deleteCount);
              this.logger?.debug(`deleteUndoRedoStacks:[${deleteStart},${deleteEnd})`);
            }

            state = 'searching';
          }
        } else {
          // type === 'execute'
          state = 'searching';
        }
      }
    }
  }

  private copyServerRecordToExecute(targetIndex: number) {
    const executeIndex = this.findExecuteIndex(targetIndex);
    if (executeIndex === -1) {
      return;
    }
    this.copyServerRecord(targetIndex, executeIndex);
  }

  private copyServerRecord(fromIndex: number, toIndex: number) {
    const fromRecord = this._records[fromIndex];
    if (!fromRecord?.serverRecord) {
      return;
    }
    const fromServerRecord = fromRecord.serverRecord;

    const toRecord = this._records[toIndex];
    if (!toRecord) {
      return;
    }

    if (toRecord.serverRecord) {
      const toServerRecord = toRecord.serverRecord;
      if (fromServerRecord.revision < toServerRecord.revision) {
        this._records[toIndex] = {
          ...toRecord,
          serverRecord: {
            revision: toServerRecord.revision,
            changeset: fromServerRecord.changeset.compose(toServerRecord.changeset),
          },
        };
      } else if (fromServerRecord.revision > toServerRecord.revision) {
        this._records[toIndex] = {
          ...toRecord,
          serverRecord: {
            revision: fromServerRecord.revision,
            changeset: toServerRecord.changeset.compose(fromServerRecord.changeset),
          },
        };
      }
    } else {
      this._records[toIndex] = {
        ...toRecord,
        serverRecord: fromServerRecord,
      };
    }
  }

  /**
   * Remove execute/undo stacks: (E*...*E*U*...*U)*E
   * @param start
   * @param end Is exclusive
   */
  private deleteExecuteUndoStacks(start: number, end: number) {
    let state: 'searching' | 'in-stack' = 'searching';
    let undoCount = 0;
    let deleteCount = 0;

    for (let i = end + 1; i >= start; i--) {
      const record = this._records[i];
      if (!record) {
        continue;
      }

      if (state === 'searching') {
        if (record.type === 'execute') {
          state = 'in-stack';
          deleteCount = 0;
        }
      } else {
        // in stack
        if (record.type === 'undo') {
          undoCount++;
        } else if (record.type === 'execute') {
          if (undoCount > 0) {
            undoCount--;
            deleteCount += 2;
          } else {
            // undoCount === 0
            // Found deletable undo stack
            if (deleteCount > 0) {
              const deleteStart = i + 1;
              const deleteEnd = deleteStart + deleteCount;
              //4,5
              for (let j = deleteEnd - 1; j >= deleteStart; j--) {
                this.copyServerRecordToExecute(j);
                this.removedRecordAtIndex(j);
              }
              this._records.splice(deleteStart, deleteCount);
              this.logger?.debug(`deleteExecuteUndoStacks:[${deleteStart},${deleteEnd})`);
            }

            state = 'searching';
          }
        } else {
          // type === 'redo'
          state = 'searching';
        }
      }
    }
  }

  /**
   * Merge squash records: (E0 * E(s) * ... * E(s)) * E1 = E0' * E1
   * @param start
   * @param end Is exclusive
   */
  private squashRecords(start: number, end: number) {
    let state: 'searching' | 'in-squash' = 'searching';
    let squashCount = 0;
    for (let i = end - 1; i >= start; i--) {
      const record = this._records[i];
      if (!record) {
        continue;
      }

      if (state === 'searching') {
        if (record.type === 'execute' && !record.squash) {
          state = 'in-squash';
          squashCount = 1;
        }
      } else {
        //state  === 'in-squash'
        if (record.squash) {
          squashCount++;
        } else {
          if (squashCount > 1) {
            const mergeStart = i;
            const mergeEnd = mergeStart + squashCount;

            this._records.splice(
              mergeStart,
              squashCount,
              this.mergeRecords(this._records.slice(mergeStart, mergeEnd))
            );
            for (let j = mergeEnd - 1; j > mergeStart; j--) {
              this.removedRecordAtIndex(j);
            }
            this.logger?.debug(`squashRecords:[${mergeStart},${mergeEnd})`);
          }

          state = 'searching';
        }
      }
    }
  }

  /**
   * Move permanent changes to the left and compose to serverToLocalHistoryTransform
   * @param start
   * @param end Is exclusive
   */
  private movePermanentChangesToLocalHistoryTransform(
    start: number,
    end: number,
    /**
     * @default true
     */
    calculateRecordsRemoved: boolean | 'between' | 'start' = true,
    firstPermanentToRight = false
  ) {
    this.logState(`movePermanentChangesToLocalHistoryTransform:before:[${start},${end})`);

    for (let i = end - 1; i >= start; i--) {
      const leftRecord = this._records[i - 1];
      const rightRecord = this._records[i];
      if (!leftRecord || !rightRecord) {
        continue;
      }

      if (leftRecord.type === 'permanent' && rightRecord.type === 'permanent') {
        this._records[i - 1] = {
          ...rightRecord,
          changeset: leftRecord.changeset.compose(rightRecord.changeset),
          serverRecord:
            leftRecord.serverRecord && rightRecord.serverRecord
              ? {
                  revision: rightRecord.serverRecord.revision,
                  changeset: leftRecord.serverRecord.changeset.compose(
                    rightRecord.serverRecord.changeset
                  ),
                }
              : (leftRecord.serverRecord ?? rightRecord.serverRecord),
        };

        this._records.splice(i, 1);
        if (calculateRecordsRemoved === true || calculateRecordsRemoved === 'between') {
          this.removedRecordAtIndex(i);
        }
      } else if (leftRecord.type !== 'permanent' && rightRecord.type === 'permanent') {
        const [newRightChangeset, newLeftChangeset] = swapChangesets(
          (this._records[i - 2]?.changeset ?? this.tailText).length,
          leftRecord.changeset,
          rightRecord.changeset
        );

        const newLeftServerRecord =
          leftRecord.serverRecord && rightRecord.serverRecord
            ? {
                revision: rightRecord.serverRecord.revision,
                changeset: leftRecord.serverRecord.changeset.compose(
                  rightRecord.serverRecord.changeset
                ),
              }
            : (leftRecord.serverRecord ?? rightRecord.serverRecord);

        this._records[i] = {
          ...leftRecord,
          changeset: newLeftChangeset,
          afterSelection: SelectionRange.closestRetainedPosition(
            leftRecord.afterSelection,
            rightRecord.changeset
          ),
          beforeSelection: SelectionRange.closestRetainedPosition(
            leftRecord.beforeSelection,
            rightRecord.changeset
          ),
          serverRecord: newLeftServerRecord,
        };

        this._records[i - 1] = {
          ...rightRecord,
          changeset: newRightChangeset,
          // serverRecord: leftRecord.serverRecord ? undefined : rightRecord.serverRecord,
          serverRecord: undefined,
        };
      }
    }

    if (start === -1) {
      const firstRecord = this._records[0];
      if (firstRecord?.type === 'permanent') {
        if (firstRecord.serverRecord) {
          if (firstPermanentToRight && this.copyServerRecordToNextIndex(0)) {
            this.serverToLocalHistoryTransform =
              this.serverToLocalHistoryTransform.compose(firstRecord.changeset);
          } else {
            this.serverTailRecord = {
              revision: firstRecord.serverRecord.revision,
              changeset: this.serverTailRecord.changeset.compose(firstRecord.changeset),
            };
            this.serverToLocalHistoryTransform =
              this.serverTailRecord.changeset.getIdentity();
          }
        } else {
          this.serverToLocalHistoryTransform = this.serverToLocalHistoryTransform.compose(
            firstRecord.changeset
          );
        }

        this._records.splice(0, 1);
        if (calculateRecordsRemoved === true || calculateRecordsRemoved === 'start') {
          this.removedRecordAtIndex(0);
        }
      }
    }

    this.logState('movePermanentChangesToLocalHistoryTransform:after');
  }

  private copyServerRecordToNextIndex(targetIndex: number) {
    // TODO reuse logic with cacheServerRecord
    const leftRecord = this._records[targetIndex];
    if (!leftRecord?.serverRecord) {
      return false;
    }
    const rightRecord = this._records[targetIndex + 1];
    if (!rightRecord) {
      return false;
    }

    if (rightRecord.serverRecord) {
      this._records[targetIndex + 1] = {
        ...rightRecord,
        serverRecord: {
          ...rightRecord.serverRecord,
          changeset: leftRecord.serverRecord.changeset.compose(
            rightRecord.serverRecord.changeset
          ),
        },
      };
    } else {
      this._records[targetIndex + 1] = {
        ...rightRecord,
        serverRecord: leftRecord.serverRecord,
      };
    }

    return true;
  }

  /**
   * Deletes identity records. A record is considered identity if composing it does nothing.
   * @param start
   * @param end Is exclusive
   */
  private deleteIdentityRecords(start: number, end: number) {
    this.logger?.debug(`deleteIdentityRecords:[${start},${end})`);
    for (let i = end - 1; i >= start; i--) {
      const record = this._records[i];
      const prevRecord = this._records[i - 1];
      if (!record || !prevRecord) {
        continue;
      }
      if (record.changeset.isIdentity(prevRecord.changeset)) {
        this.copyServerRecordToNextIndex(i);

        this._records.splice(i, 1);
        this.removedRecordAtIndex(i);
        this.logger?.debug(`deleteIdentityRecord:${i}`);
      }
    }

    if (start === -1) {
      const firstRecord = this._records[0];
      if (firstRecord?.changeset.isIdentity(this.serverToLocalHistoryTransform)) {
        this.copyServerRecordToNextIndex(0);
        this._records.splice(0, 1);
        this.removedRecordAtIndex(0);
        this.logger?.debug(`deleteIdentityRecord:0`);
      }
    }
  }

  private getRecord(index: number): ReadonlyHistoryRecord {
    const record = this._records[index];
    if (!record) {
      throw new Error(`No record at index "${index}"`);
    }
    return record;
  }

  /**
   * If record is undo or redo then it returns execute record that it applies to
   */
  private findExecuteIndex(targetIndex: number): number {
    let undoStack = 0;
    for (let i = targetIndex; i >= 0; i--) {
      const record = this._records[i];
      if (!record) {
        continue;
      }

      if (record.type === 'undo') {
        undoStack++;
      } else if (record.type === 'redo') {
        undoStack--;
      } else if (record.type === 'execute') {
        if (undoStack === 0) {
          return i;
        }

        undoStack--;
      } else {
        // type === 'permanent'
        return -1;
      }
    }

    return -1;
  }

  /**
   * Moves local index to first smaller index execute record
   */
  private decreaseLocalIndex() {
    this.lastExecutedIndex.execute = this.getNextDecreaseLocalIndex();
  }

  private getNextDecreaseLocalIndex() {
    let undoStack = 0;
    for (let i = this.lastExecutedIndex.execute - 1; i >= 0; i--) {
      const record = this._records[i];
      if (!record) {
        continue;
      }

      if (record.type === 'undo') {
        undoStack++;
      } else if (record.type === 'redo') {
        undoStack--;
      } else if (record.type === 'execute') {
        if (undoStack === 0) {
          return i;
        }

        undoStack--;
      } else {
        // type === 'permanent', can't decrease past permanent record
        return i;
      }
    }

    return -1;
  }

  /**
   * Moves local index to first bigger index execute record
   */
  private increaseLocalIndex() {
    this.lastExecutedIndex.execute = this.getNextIncreaseLocalIndex();
  }

  private getNextIncreaseLocalIndex() {
    for (let i = this.lastExecutedIndex.execute + 1; i < this._records.length; i++) {
      const record = this._records[i];
      if (!record) {
        continue;
      }

      if (record.type === 'execute') {
        return i;
      }
    }

    return -1;
  }

  canUndo() {
    return Boolean(this._records[this.lastExecutedIndex.execute]?.type === 'execute');
  }

  // TODO static method
  private mergeRecords(records: ReadonlyHistoryRecord[]): ReadonlyHistoryRecord {
    const firstRecord = records[0];
    const lastRecord = records[records.length - 1];
    if (!firstRecord || !lastRecord) {
      // TODO static empty record
      return {
        type: 'execute',
        changeset: Changeset.EMPTY,
        beforeSelection: SelectionRange.EMPTY,
        afterSelection: SelectionRange.EMPTY,
      };
    }

    const composedChangeset = records
      .slice(1)
      .reduce((a, b) => a.compose(b.changeset), firstRecord.changeset);

    // Compose server records too
    const serverRecords = records.map((r) => r.serverRecord).filter(isDefined);
    const composedServerRecord =
      serverRecords.length > 0
        ? serverRecords.reduce((a, b) => ({
            revision: b.revision,
            changeset: a.changeset.compose(b.changeset),
          }))
        : null;

    return {
      ...firstRecord,
      changeset: composedChangeset,
      afterSelection: lastRecord.afterSelection,
      ...(composedServerRecord && { serverRecord: composedServerRecord }),
    };
  }

  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    // TODO put state in a single object so that it's easier to do transaction??

    const beforeHaveLocalChanges = this.haveLocalChanges();

    const transactionResult = this.withTransaction<ReadonlyHistoryRecord | undefined>(
      'undo',
      () => {
        const appliedRecords: ReadonlyHistoryRecord[] = [];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const record = this._records[this.lastExecutedIndex.execute];
          if (record?.type !== 'execute') {
            break;
          }

          const inverseChangeset = record.changeset.inverse(
            this.getTextAt(this.lastExecutedIndex.execute - 1)
          );

          this.decreaseLocalIndex();

          const applyRecord: ReadonlyHistoryRecord = {
            type: 'undo',
            changeset: inverseChangeset,
            beforeSelection: record.afterSelection,
            afterSelection: record.beforeSelection,
          };

          this._records.push(applyRecord);
          appliedRecords.push(applyRecord);

          if (!record.squash) {
            break;
          }
        }

        if (appliedRecords.length === 0) {
          return;
        }

        // TODO redundant?
        this.recordsCleanup(this.lastExecutedIndex.submitted + 1, this._records.length);

        return this.mergeRecords(appliedRecords);
      }
    );

    if (transactionResult) {
      // Transaction was successful
      this._eventBus.emit('viewChanged', {
        view: this.view,
        change: transactionResult.changeset,
        source: ChangeSource.LOCAL,
      });

      this._eventBus.emit('appliedTypingOperation', {
        operation: {
          changeset: transactionResult.changeset,
          selection: transactionResult.afterSelection,
        },
      });

      this._eventBus.emit('appliedUndo', {
        operation: {
          changeset: transactionResult.changeset,
          selection: transactionResult.afterSelection,
        },
      });

      if (!beforeHaveLocalChanges && this.haveLocalChanges()) {
        this._eventBus.emit('haveLocalChanges', { local: this.local });
      }
    }

    return !!transactionResult;
  }

  canRedo() {
    return Boolean(this._records[this.getNextIncreaseLocalIndex()]);
  }

  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    const beforeHaveLocalChanges = this.haveLocalChanges();

    const transactionResult = this.withTransaction('redo', () => {
      const appliedRecords: ReadonlyHistoryRecord[] = [];

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        this.increaseLocalIndex();

        const record = this._records[this.lastExecutedIndex.execute];
        if (record?.type !== 'execute') {
          break;
        }

        const applyRecord: ReadonlyHistoryRecord = {
          type: 'redo',
          changeset: record.changeset,
          beforeSelection: record.beforeSelection,
          afterSelection: record.afterSelection,
        };

        this._records.push(applyRecord);
        appliedRecords.push(applyRecord);

        const nextIncreaseLocalIndex = this.getNextIncreaseLocalIndex();
        if (!this._records[nextIncreaseLocalIndex]?.squash) {
          break;
        }
      }

      if (appliedRecords.length === 0) {
        return;
      }

      this.recordsCleanup(this.lastExecutedIndex.submitted + 1, this._records.length);

      return this.mergeRecords(appliedRecords);
    });

    if (transactionResult) {
      // Transaction was successful
      this._eventBus.emit('viewChanged', {
        view: this.view,
        change: transactionResult.changeset,
        source: ChangeSource.LOCAL,
      });

      this._eventBus.emit('appliedTypingOperation', {
        operation: {
          changeset: transactionResult.changeset,
          selection: transactionResult.afterSelection,
        },
      });

      this._eventBus.emit('appliedRedo', {
        operation: {
          changeset: transactionResult.changeset,
          selection: transactionResult.afterSelection,
        },
      });

      if (!beforeHaveLocalChanges && this.haveLocalChanges()) {
        this._eventBus.emit('haveLocalChanges', { local: this.local });
      }
    }

    return !!transactionResult;
  }

  private removedRecordAtIndex(index: number) {
    if (index <= this.lastExecutedIndex.execute) {
      this.lastExecutedIndex.execute--;
    }
    if (index <= this.lastExecutedIndex.submitted) {
      this.lastExecutedIndex.submitted--;
    }
    if (index <= this.lastExecutedIndex.server) {
      this.lastExecutedIndex.server--;
    }
  }

  private addedRecordAtIndex(index: number) {
    if (index <= this.lastExecutedIndex.execute) {
      this.lastExecutedIndex.execute++;
    }
    if (index <= this.lastExecutedIndex.submitted) {
      this.lastExecutedIndex.submitted++;
    }
    if (index <= this.lastExecutedIndex.server) {
      this.lastExecutedIndex.server++;
    }
  }

  serialize(keepServerRecords = false) {
    if (keepServerRecords) {
      return CollabHistoryOptionsStruct.createRaw({
        serverTailRecord: this.serverTailRecord,
        serverToLocalHistoryTransform: this.serverToLocalHistoryTransform.isIdentity(
          this.serverTailRecord.changeset
        )
          ? null
          : this.serverToLocalHistoryTransform,
        records: this._records,
        lastExecutedIndex: this.lastExecutedIndex,
      });
    } else if (this.lastExecutedIndex.execute < this.lastExecutedIndex.server) {
      let keepIndex = Math.max(
        0,
        Math.min(this.lastExecutedIndex.server + 1, this.lastExecutedIndex.execute + 1)
      );

      const allServerRecords: ServerRecord[] = [];
      for (let i = keepIndex - 1; i >= 0; i--) {
        const record = this._records[i];
        if (record?.serverRecord) {
          allServerRecords.unshift(record.serverRecord);
        }
        if (allServerRecords.length === 0) {
          keepIndex = i;
        }
      }

      // const mergeTransformRecords: Changeset[] = this.records
      //   .slice(keepIndex, this.lastExecutedIndex.server)
      //   .map((r) => r.changeset);
      // const firstMergeTransformRecord = mergeTransformRecords[0];
      // const newServerToLocalHistoryTransform = firstMergeTransformRecord
      //   ? mergeTransformRecords
      //       .slice(1)
      //       .reduce((a, b) => a.compose(b), firstMergeTransformRecord)
      //   : null;

      // logAll({
      //   keepIndex,
      //   allServerRecords,
      //   mergeTransformRecords,
      //   newServerToLocalHistoryTransform
      // });

      // TODO test serializing this!

      return CollabHistoryOptionsStruct.createRaw({
        serverTailRecord: allServerRecords.reduce(
          (a, b) => ({
            changeset: a.changeset.compose(b.changeset),
            revision: b.revision,
          }),
          this.serverTailRecord
        ),
        // serverToLocalHistoryTransform: newServerToLocalHistoryTransform,
        serverToLocalHistoryTransform: null,
        records: this._records.slice(keepIndex),
        lastExecutedIndex: {
          server: this.lastExecutedIndex.server - keepIndex,
          submitted: this.lastExecutedIndex.submitted - keepIndex,
          execute: this.lastExecutedIndex.execute - keepIndex,
        },
      });
    } else {
      const record = this._records[this.lastExecutedIndex.server];
      const serverRevision = record?.serverRecord?.revision;
      // TODO query serverRevison from CollabService
      if (serverRevision === undefined) {
        return CollabHistoryOptionsStruct.createRaw({
          serverTailRecord: this.serverTailRecord,
          serverToLocalHistoryTransform: this.serverToLocalHistoryTransform.isIdentity(
            this.serverTailRecord.changeset
          )
            ? null
            : this.serverToLocalHistoryTransform,
          records: this._records,
          lastExecutedIndex: this.lastExecutedIndex,
        });
      } else {
        const keepIndex = this.lastExecutedIndex.server + 1;

        return CollabHistoryOptionsStruct.createRaw({
          serverTailRecord: {
            changeset: this.server,
            revision: serverRevision,
          },
          serverToLocalHistoryTransform: null,
          records: this._records.slice(keepIndex),
          lastExecutedIndex: {
            server: -1,
            submitted: this.lastExecutedIndex.submitted - keepIndex,
            execute: this.lastExecutedIndex.execute - keepIndex,
          },
        });
      }
    }
  }

  // TODO set private
  logState(message: string, data?: Record<string, unknown>) {
    function catchErr<T>(fn: () => T): T | string {
      try {
        return fn();
      } catch (err) {
        return err instanceof Error ? err.message : 'error';
      }
    }

    function selectionString(record: ReadonlyHistoryRecord) {
      return (
        Object.values(SelectionRange.collapseSame(record.beforeSelection)).join('_') +
        ' -> ' +
        Object.values(SelectionRange.collapseSame(record.afterSelection)).join('_')
      );
    }

    this.logger?.debug(message, {
      ...data,
      state: {
        serverTailRecord: this.serverTailRecord,
        serverToLocalHistoryTransform: this.serverToLocalHistoryTransform,
        lastExecutedIndex: { ...this.lastExecutedIndex },
        server: catchErr(() => this.server),
        submitted: catchErr(() => this.submitted),
        local: catchErr(() => this.local),
        view: catchErr(() => this.view),
        submittedView: catchErr(() => this.submittedView),
        viewText: catchErr(() => this.view.joinInsertions()),
        haveLocalChanges: catchErr(() => this.haveLocalChanges()),
        haveSubmittedChanges: catchErr(() => this.haveSubmittedChanges()),
        records: [...new Array<undefined>(this.records.length)].map((_, i) => {
          const record = this._records[i];
          return record
            ? {
                index: i,
                type: `${record.type}${record.squash ? '(s)' : ''}`,
                changeset: record.changeset,
                composed: catchErr(() => this.getTextAt(i)),
                selection: selectionString(record),
                ...(record.serverRecord && { serverRecord: record.serverRecord }),
              }
            : null;
        }),
      },
    });
  }

  static parseValue(
    value: unknown
  ): Pick<
    CollabHistoryOptions,
    'serverTailRecord' | 'serverToLocalHistoryTransform' | 'records' | 'lastExecutedIndex'
  > {
    return CollabHistoryOptionsStruct.create(value);
  }
}
