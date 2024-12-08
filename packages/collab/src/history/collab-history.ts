import mitt, { Emitter } from 'mitt';
import {
  array,
  assign,
  coerce,
  Infer,
  literal,
  number,
  object,
  omit,
  union,
  unknown,
} from 'superstruct';

import { Maybe, ReadonlyDeep } from '~utils/types';

import { Changeset, ChangesetStruct } from '../changeset';
import { OptionalChangesetStruct } from '../changeset/struct';
import { CollabClient } from '../client/collab-client';
import {
  OptionalSelectionRange,
  SelectionRange,
  SelectionRangeStruct,
} from '../client/selection-range';
import { UserRecords } from '../client/user-records';
import { ComposableRecordsFacade } from '../records/composable-records-facade';
import { RevisionChangeset, SubmittedRevisionRecord } from '../records/record';
import { TextMemoRecords } from '../records/text-memo-records';
import { SimpleTextOperationOptions , SelectionChangeset } from '../types';

import { processExternalChange } from './process-external-change';
import { processRecordsUnshift } from './process-records-unshift';


export interface CollabHistoryEvents {
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

 
const HistoryRecordStruct = object({
  changeset: ChangesetStruct,
  afterSelection: SelectionRangeStruct,
  beforeSelection: SelectionRangeStruct,
});

const ExpandedHistoryRecordArrayStruct = array(HistoryRecordStruct);

const CollapsedHistoryRecordArrayStruct = array(
  assign(
    omit(HistoryRecordStruct, ['beforeSelection']),
    object({
      beforeSelection: OptionalSelectionRange,
    })
  )
);

// Removes beforeSelection if it matched previous record afterSelection
export const HistoryRecordArrayStruct = coerce(
  ExpandedHistoryRecordArrayStruct,
  unknown(),
  (unknownRecords) => {
    const collapsedRecords = CollapsedHistoryRecordArrayStruct.create(unknownRecords);
    return collapsedRecords.map((record, index) =>
      record.beforeSelection
        ? record
        : {
            ...record,
            beforeSelection:
              collapsedRecords[index - 1]?.afterSelection ?? SelectionRange.from(0),
          }
    );
  },
  (expandedRecords) => {
    return CollapsedHistoryRecordArrayStruct.createRaw(
      expandedRecords.map((record, index) =>
        SelectionRange.isEqual(
          record.beforeSelection,
          expandedRecords[index - 1]?.afterSelection
        )
          ? {
              changeset: record.changeset,
              afterSelection: record.afterSelection,
            }
          : record
      )
    );
  }
);

const LastExecutedIndexStruct = object({
  server: number(),
  submitted: number(),
  local: number(),
});

const ServerTailTextTransformToRecordsTailTextStruct = union([
  ChangesetStruct,
  literal(null),
]);

export const CollabHistoryOptionsStruct = object({
  records: HistoryRecordArrayStruct,
  recordsTailText: OptionalChangesetStruct,
  serverTailRevision: number(),
  serverTailTextTransformToRecordsTailText:
    ServerTailTextTransformToRecordsTailTextStruct,
  lastExecutedIndex: LastExecutedIndexStruct,
});

interface Operation {
  changeset: Changeset;
  selection: SelectionRange;
}

export type HistoryRecord = Infer<typeof HistoryRecordStruct>;

export interface ReadonlyHistoryRecord {
  readonly changeset: HistoryRecord['changeset'];
  readonly afterSelection: ReadonlyDeep<HistoryRecord['afterSelection']>;
  readonly beforeSelection: ReadonlyDeep<HistoryRecord['beforeSelection']>;
}

type LastExecutedIndex = Infer<typeof LastExecutedIndexStruct>;

export type HistoryRestoreEntry =
  | {
      type: 'external';
      changeset: Changeset;
    }
  | ({
      type: 'local';
    } & ReadonlyHistoryRecord);

export interface CollabHistoryOptions {
  eventBus?: Emitter<CollabHistoryEvents>;
  client?: CollabClient;
  records?: ReadonlyHistoryRecord[];
  serverTailRevision?: number;
  recordsTailText?: Changeset;
  lastExecutedIndex?: LastExecutedIndex;
  serverTailTextTransformToRecordsTailText?: Maybe<Changeset>;
}

export class CollabHistory {
  private readonly _eventBus: Emitter<CollabHistoryEvents>;
  get eventBus(): Pick<Emitter<CollabHistoryEvents>, 'on' | 'off'> {
    return this._eventBus;
  }

  private client: CollabClient;

  /**
   * Transforms serverTailText to a changeset compatible with local records.
   * serverTailText * serverTailTextTransformToRecordsTailText = _records.tailText
   */
  private serverTailTextTransformToRecordsTailText: Changeset | null;

  /**
   * Modifying this instance directly can lead to invalid state
   */
  private readonly readonlyRecords: TextMemoRecords<ReadonlyHistoryRecord>;
  /**
   * Use this instance to modify records. Prevents invalid modifications.
   */
  private readonly modifyRecords: ComposableRecordsFacade<ReadonlyHistoryRecord>;

  get records(): readonly ReadonlyHistoryRecord[] {
    return this.readonlyRecords.items;
  }

  /**
   * Server revision that this history records are up to date with.
   */
  private _serverTailRevision: number;

  /**
   * Server revision that this history records are up to date with.
   */
  get serverTailRevision() {
    return this._serverTailRevision;
  }

  private lastExecutedIndex: LastExecutedIndex;

  /**
   * Record index that matches CollabClient.local after after it's applied
   */
  get localIndex() {
    return this.lastExecutedIndex.local;
  }

  private readonly eventsOff: (() => void)[];

  constructor(options?: CollabHistoryOptions) {
    this._eventBus = options?.eventBus ?? mitt();
    this.client = options?.client ?? new CollabClient();

    this.serverTailTextTransformToRecordsTailText =
      options?.serverTailTextTransformToRecordsTailText ??
      options?.serverTailTextTransformToRecordsTailText ??
      null;
    this.readonlyRecords = new TextMemoRecords({
      records: options?.records,
      tailText: options?.recordsTailText ?? this.client.server,
    });
    this.modifyRecords = new ComposableRecordsFacade(this.readonlyRecords);

    this._serverTailRevision = options?.serverTailRevision ?? 0;

    this.lastExecutedIndex = options?.lastExecutedIndex ?? {
      server: -1,
      submitted: -1,
      local: -1,
    };

    this.eventsOff = [
      this.client.eventBus.on('submitChanges', () => {
        this.lastExecutedIndex.submitted = this.lastExecutedIndex.local;
      }),
      this.client.eventBus.on('submittedChangesAcknowledged', () => {
        this.lastExecutedIndex.server = this.lastExecutedIndex.submitted;
      }),
      this.client.eventBus.on('handledExternalChange', ({ externalChange }) => {
        this.processExternalChange(externalChange);
      }),
    ];
  }

  reset(options?: Pick<CollabHistoryOptions, 'serverTailRevision'>) {
    this.modifyRecords.clear(this.client.server);

    this.serverTailTextTransformToRecordsTailText = null;

    this._serverTailRevision = options?.serverTailRevision ?? 0;

    this.lastExecutedIndex = {
      server: -1,
      submitted: -1,
      local: -1,
    };
  }

  /**
   * Removes event listeners from client. This instance becomes useless.
   */
  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }

  /**
   * Changeset that matches `client.view`
   */
  getHeadText(): Changeset {
    return this.readonlyRecords.getTextAt(this.lastExecutedIndex.local);
  }

  /**
   *
   * @returns After and before selection that will match `client.submitted`
   */
  getSubmitSelection(): Pick<
    SubmittedRevisionRecord,
    'afterSelection' | 'beforeSelection'
  > {
    if (this.lastExecutedIndex.server < this.lastExecutedIndex.local) {
      const oldestLocalRecord = this.readonlyRecords.at(
        this.lastExecutedIndex.server + 1
      );
      const localRecord = this.readonlyRecords.at(this.lastExecutedIndex.local);
      if (!oldestLocalRecord || !localRecord) {
        return {
          beforeSelection: SelectionRange.ZERO,
          afterSelection: SelectionRange.ZERO,
        };
      }

      return {
        beforeSelection: oldestLocalRecord.beforeSelection,
        afterSelection: localRecord.afterSelection,
      };
    } else {
      // this.lastExecutedIndex.server >= this.lastExecutedIndex.local
      const serverRecord = this.readonlyRecords.at(this.lastExecutedIndex.server);
      const localRecord = this.readonlyRecords.at(this.lastExecutedIndex.local);
      if (!serverRecord) {
        return {
          beforeSelection: SelectionRange.ZERO,
          afterSelection: SelectionRange.ZERO,
        };
      }

      return {
        beforeSelection: serverRecord.afterSelection,
        afterSelection: localRecord
          ? localRecord.afterSelection
          : serverRecord.beforeSelection,
      };
    }
  }

  pushSelectionChangeset(
    value: SelectionChangeset,
    options?: SimpleTextOperationOptions
  ) {
    if (value.changeset.isIdentity(this.getHeadText())) {
      return;
    }

    const merge = options?.merge ?? false;
    const localIndex = this.lastExecutedIndex.local;
    const localRecord = this.readonlyRecords.at(this.lastExecutedIndex.local);

    this.modifyRecords.deleteFromThenPush(localIndex + 1, {
      changeset: value.changeset,
      afterSelection: value.afterSelection,
      beforeSelection:
        value.beforeSelection ?? localRecord?.afterSelection ?? SelectionRange.from(0),
    });

    // Adjust indexes based on deleted records

    if (0 <= localIndex && localIndex < this.readonlyRecords.length - 1) {
      this.lastExecutedIndex.submitted = Math.min(
        this.lastExecutedIndex.submitted,
        localIndex
      );
      this.lastExecutedIndex.server = Math.min(
        this.lastExecutedIndex.server,
        this.lastExecutedIndex.submitted
      );
    } else if (localIndex === -1) {
      this.lastExecutedIndex.submitted = -1;
      this.lastExecutedIndex.server = -1;
    }

    // Applies pushed record
    this.redo();

    // return
    if (merge) {
      const afterLocalIndex = this.lastExecutedIndex.local;
      if (localIndex < 0) {
        this.mergeToRecordsTailText(afterLocalIndex + 1);
      } else {
        this.mergeRecords(localIndex, afterLocalIndex);
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

    const { records: relevantRecords, ownCount: potentialRestoreCount } =
      userRecords.sliceOlderRecordsUntilDesiredOwnCount(
        this._serverTailRevision,
        desiredRestoreCount
      );

    const firstRecord = relevantRecords[0];
    if (!firstRecord) return;

    const tailText = userRecords.getTextAt(firstRecord.revision - 1);

    const addedEntriesCount = this.recordsUnshift(
      tailText,
      relevantRecords.map((record) => {
        const isOtherUserRecord = !userRecords.isOwnRecord(record);
        if (!record.beforeSelection || !record.afterSelection || isOtherUserRecord) {
          return {
            type: 'external',
            changeset: record.changeset,
          };
        } else {
          return {
            type: 'local',
            changeset: record.changeset,
            afterSelection: record.afterSelection,
            beforeSelection: record.beforeSelection,
          };
        }
      })
    );

    let restoredCount = addedEntriesCount;

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
   * @param tailText First element in {@link entries} is composable on {@link tailText}.
   * @param entries Text entries.
   */
  private recordsUnshift(tailText: RevisionChangeset, entries: HistoryRestoreEntry[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const beforeRecordsCount = this.readonlyRecords.length;

    processRecordsUnshift(
      {
        newEntries: entries,
        newRecordsTailText: tailText.changeset,
      },
      {
        get serverTailTextTransformToRecordsTailText() {
          return _this.serverTailTextTransformToRecordsTailText;
        },
        set serverTailTextTransformToRecordsTailText(value) {
          _this.serverTailTextTransformToRecordsTailText = value;
        },
        recordsReplaceTailTextAndSplice: this.modifyRecords.replaceTailTextAndSplice.bind(
          this.modifyRecords
        ),
      }
    );
    this.deleteIdentityRecords();

    this._serverTailRevision = tailText.revision;
    const addedEntriesCount = this.readonlyRecords.length - beforeRecordsCount;

    this.lastExecutedIndex.server += addedEntriesCount;
    this.lastExecutedIndex.submitted += addedEntriesCount;
    this.lastExecutedIndex.local += addedEntriesCount;

    return addedEntriesCount;
  }

  canUndo() {
    return Boolean(this.readonlyRecords.at(this.lastExecutedIndex.local));
  }

  undo() {
    const record = this.readonlyRecords.at(this.lastExecutedIndex.local);
    if (record) {
      this.lastExecutedIndex.local--;

      const inverseChangeset = record.changeset.inverse(
        this.readonlyRecords.getTextAt(this.lastExecutedIndex.local)
      );
      this.client.composeLocalChange(inverseChangeset);
      this._eventBus.emit('appliedTypingOperation', {
        operation: {
          changeset: inverseChangeset,
          selection: record.beforeSelection,
        },
      });

      this._eventBus.emit('appliedUndo', {
        operation: {
          changeset: inverseChangeset,
          selection: record.beforeSelection,
        },
      });
      return true;
    }
    return false;
  }

  canRedo() {
    return Boolean(this.readonlyRecords.at(this.lastExecutedIndex.local + 1));
  }

  redo() {
    const record = this.readonlyRecords.at(this.lastExecutedIndex.local + 1);
    if (record) {
      this.lastExecutedIndex.local++;

      this.client.composeLocalChange(record.changeset);
      this._eventBus.emit('appliedTypingOperation', {
        operation: {
          changeset: record.changeset,
          selection: record.afterSelection,
        },
      });

      this._eventBus.emit('appliedRedo', {
        operation: {
          changeset: record.changeset,
          selection: record.afterSelection,
        },
      });
      return true;
    }

    return false;
  }

  private processExternalChange(changeset: Changeset) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    processExternalChange(changeset, {
      client: this.client,
      get serverTailTextTransformToRecordsTailText() {
        return _this.serverTailTextTransformToRecordsTailText;
      },
      set serverTailTextTransformToRecordsTailText(value) {
        _this.serverTailTextTransformToRecordsTailText = value;
      },
      records: {
        at: this.readonlyRecords.at.bind(this.readonlyRecords),
        getTextAt: this.readonlyRecords.getTextAt.bind(this.readonlyRecords),
        get length() {
          return _this.readonlyRecords.length;
        },
        get tailText() {
          return _this.readonlyRecords.tailText;
        },
      },
      serverIndex: this.lastExecutedIndex.server,
      recordsReplaceTailTextAndSplice: this.modifyRecords.replaceTailTextAndSplice.bind(
        this.modifyRecords
      ),
    });

    this.deleteIdentityRecords();
  }

  private entryAtIndexDeleted(index: number) {
    if (index <= this.lastExecutedIndex.local) {
      this.lastExecutedIndex.local--;
    }
    if (index <= this.lastExecutedIndex.submitted) {
      this.lastExecutedIndex.submitted--;
    }
    if (index <= this.lastExecutedIndex.server) {
      this.lastExecutedIndex.server--;
    }
  }

  private mergeRecords(startIndex: number, endIndex: number) {
    // Do not merge serverIndex => submittedIndex records
    // That record is requird for processing external changes
    startIndex = Math.max(startIndex, this.lastExecutedIndex.submitted + 1);
    if (endIndex <= startIndex) {
      return;
    }

    const startRecord = this.readonlyRecords.at(startIndex);
    const endRecord = this.readonlyRecords.at(endIndex);
    if (!startRecord || !endRecord) {
      return;
    }

    const mergingRecordValue = { ...startRecord };

    for (let i = startIndex + 1; i <= endIndex; i++) {
      const nextRecord = this.readonlyRecords.at(i);
      if (!nextRecord) {
        continue;
      }

      mergingRecordValue.changeset = mergingRecordValue.changeset.compose(
        nextRecord.changeset
      );
    }

    // Copy afterSelection from end record
    mergingRecordValue.afterSelection = endRecord.afterSelection;

    this.modifyRecords.splice(startIndex, endIndex - startIndex + 1, mergingRecordValue);

    for (let i = endIndex; i > startIndex; i--) {
      this.entryAtIndexDeleted(i);
    }

    return true;
  }

  /**
   * Invoke only when no server records
   */
  private mergeToRecordsTailText(count: number) {
    // Do not merge submittedIndex => serverIndex record
    // That record is requird for processing external changes
    count = Math.max(count, this.lastExecutedIndex.submitted);

    let mergedTailText = this.readonlyRecords.tailText;
    for (let i = 0; i < count; i++) {
      const nextRecord = this.readonlyRecords.at(i);
      if (!nextRecord) {
        continue;
      }
      mergedTailText = mergedTailText.compose(nextRecord.changeset);
    }

    this.modifyRecords.replaceTailTextAndSplice(mergedTailText, 0, count);

    for (let i = count - 1; i >= 0; i--) {
      this.entryAtIndexDeleted(i);
    }
  }
  /**
   * Deletes identity records. A record is considered identity if composing it does nothing.
   */
  private deleteIdentityRecords() {
    for (let i = this.readonlyRecords.length - 1; i >= 0; i--) {
      const record = this.readonlyRecords.at(i);
      if (!record) {
        continue;
      }
      const text = this.readonlyRecords.getTextAt(i - 1);
      if (record.changeset.isIdentity(text)) {
        this.modifyRecords.splice(i, 1);
        this.entryAtIndexDeleted(i);
      }
    }
  }

  serialize(keepServerEntries = false) {
    let records = this.readonlyRecords.slice();
    let lastExecutedIndex = this.lastExecutedIndex;
    if (!keepServerEntries) {
      const offset = this.lastExecutedIndex.server + 1;
      records = records.slice(offset);
      lastExecutedIndex = {
        server: -1,
        submitted: this.lastExecutedIndex.submitted - offset,
        local: this.lastExecutedIndex.local - offset,
      };
    }

    return CollabHistoryOptionsStruct.createRaw({
      records,
      serverTailRevision: this._serverTailRevision,
      recordsTailText: this.getTailTextForSerialize(keepServerEntries),
      serverTailTextTransformToRecordsTailText:
        this.serverTailTextTransformToRecordsTailText,
      lastExecutedIndex,
    });
  }

  private getTailTextForSerialize(keepServerEntries = false) {
    if (this.readonlyRecords.tailText.isEqual(this.client.server)) {
      return;
    }

    if (this.lastExecutedIndex.server < 0 || keepServerEntries) {
      return this.readonlyRecords.tailText;
    }

    return;
  }

  static parseValue(
    value: unknown
  ): Pick<
    CollabHistoryOptions,
    | 'records'
    | 'serverTailRevision'
    | 'recordsTailText'
    | 'lastExecutedIndex'
    | 'serverTailTextTransformToRecordsTailText'
  > {
    return CollabHistoryOptionsStruct.create(value);
  }
}
