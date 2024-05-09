import mitt, { Emitter } from '~utils/mitt-unsub';

import { Changeset, SerializedChangeset } from '../changeset/changeset';
import { CollabClient } from './collab-client';

import { ChangesetOperation } from './changeset-operations';
import { SelectionRange } from './selection-range';
import { PartialBy } from '~utils/types';
import {
  RevisionChangeset,
  ServerRevisionRecord,
  SubmittedRevisionRecord,
} from '../records/record';
import { RevisionTailRecords } from '../records/revision-tail-records';
import {
  ParseError,
  Serializable,
  assertHasProperties,
  parseNumber,
  parseNumberMaybe,
} from '~utils/serialize';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LocalChangesetEditorHistoryEvents = {
  appliedTypingOperation: {
    operation: Operation;
  };
};

export interface SerializedCollabHistory {
  entries: Entry<SerializedChangeset>[];

  tailText: SerializedChangeset;
  tailRevision: number;

  tailComposition?: SerializedChangeset;

  lastExecutedIndex: {
    server: number;
    submitted: number;
    local: number;
  };
}

export type HistoryServerRecord = Pick<ServerRevisionRecord, 'changeset' | 'revision'> &
  Partial<
    Pick<ServerRevisionRecord, 'beforeSelection' | 'afterSelection' | 'creatorUserId'>
  >;

export interface Operation<TChangeset = Changeset> {
  changeset: TChangeset;
  selection: SelectionRange;
}

export interface Entry<TChangeset = Changeset> {
  execute: Operation<TChangeset>;
  undo: Operation<TChangeset>;
}

export interface AddEntry {
  execute: Operation;
  undo: PartialBy<Operation, 'changeset'>;
  isTail?: false;
}

export interface TailEntry {
  execute: Omit<Operation, 'selection'>;
  undo?: Omit<PartialBy<Operation, 'changeset'>, 'selection'>;
  /**
   * Entry is composed on tailText.
   */
  isTail: true;
}

export type AnyEntry = AddEntry | TailEntry;

type AnyEntryWithUndo = AnyEntry & { undo: Pick<Operation, 'changeset'> };

interface LastExecutedIndex {
  server: number;
  submitted: number;
  local: number;
}

export interface CollabHistoryOptions {
  eventBus?: Emitter<LocalChangesetEditorHistoryEvents>;
  client?: CollabClient;
  entries?: Entry[];
  tailRevision?: number;
  tailText?: Changeset;
  lastExecutedIndex?: LastExecutedIndex;
  tailComposition?: Changeset;
}

/**
 * Maintains a history of {@link CollabClient.local} changeset.
 * External changes alter history as if change has always been there.
 */
export class CollabHistory implements Serializable<SerializedCollabHistory> {
  readonly eventBus: Emitter<LocalChangesetEditorHistoryEvents>;

  private client: CollabClient;

  private _entries: Entry[];
  get entries(): Readonly<Entry[]> {
    return this._entries;
  }

  private _tailText = Changeset.EMPTY;
  /**
   * History entries are are composed starting from this changeset
   */
  get tailText() {
    return this._tailText;
  }

  private _tailRevision: number;
  get tailRevision() {
    return this._tailRevision;
  }

  private tailComposition: Changeset | undefined;

  private lastExecutedIndex: LastExecutedIndex;

  /**
   * Entry index that matches CollabClient.server after execute
   */
  get serverIndex() {
    return this.lastExecutedIndex.server;
  }

  /**
   * Entry index that maches CollabClient.submitted after execute
   */
  get submittedIndex() {
    return this.lastExecutedIndex.submitted;
  }

  /**
   * Entry index that maches CollabClient.local after execute
   */
  get localIndex() {
    return this.lastExecutedIndex.local;
  }

  private unsubscribeFromEvents: () => void;

  constructor(options?: CollabHistoryOptions) {
    this.eventBus = options?.eventBus ?? mitt();
    this.client = options?.client ?? new CollabClient();

    this._tailText = options?.tailText ?? this.client.server;
    this._tailRevision = options?.tailRevision ?? -1;

    this.tailComposition = options?.tailComposition;
    this.lastExecutedIndex = options?.lastExecutedIndex ?? {
      server: -1,
      submitted: -1,
      local: -1,
    };

    this._entries = options?.entries ?? [];

    const subscribedListeners = [
      this.client.eventBus.on('submitChanges', () => {
        this.lastExecutedIndex.submitted = this.lastExecutedIndex.local;
      }),
      this.client.eventBus.on('submittedChangesAcknowledged', () => {
        this.lastExecutedIndex.server = this.lastExecutedIndex.submitted;
      }),
      this.client.eventBus.on('handledExternalChange', ({ externalChange }) => {
        this.adjustHistoryToExternalChange(externalChange);
      }),
    ];
    this.unsubscribeFromEvents = () => {
      subscribedListeners.forEach((unsub) => {
        unsub();
      });
    };
  }

  /**
   * Removes event listeners from client. This instance becomes useless.
   */
  cleanUp() {
    this.unsubscribeFromEvents();
  }

  /**
   * Composition of tailText and all history execute changesets.
   */
  getHeadText() {
    return this.entries.reduce((a, b) => a.compose(b.execute.changeset), this._tailText);
  }

  getSubmitSelection():
    | Pick<SubmittedRevisionRecord, 'afterSelection' | 'beforeSelection'>
    | undefined {
    if (this.lastExecutedIndex.server < this.lastExecutedIndex.local) {
      const before = this.entries[this.lastExecutedIndex.server + 1];
      const after = this.entries[this.lastExecutedIndex.local];
      if (!before || !after) return;
      return {
        beforeSelection: before.undo.selection,
        afterSelection: after.execute.selection,
      };
    } else {
      const before = this.entries[this.lastExecutedIndex.server];
      const after = this.entries[this.lastExecutedIndex.local];
      if (!before || !after) return;
      return {
        beforeSelection: before.execute.selection,
        afterSelection: after.execute.selection,
      };
    }
  }

  /**
   *
   * @param index Negative index counts from end of entries. -1 is last entry.
   * @returns
   */
  at(index: number): Entry | undefined {
    if (index < 0) {
      index += this.entries.length;
    }

    return this.entries[index];
  }

  pushChangesetOperation({
    changeset,
    inverseChangeset,
    selection,
    inverseSelection,
  }: ChangesetOperation) {
    const entry: Entry = {
      execute: {
        changeset,
        selection,
      },
      undo: {
        changeset: inverseChangeset,
        selection: inverseSelection,
      },
    };

    this.deleteNewerEntries(this.lastExecutedIndex.local);

    this.push([entry]);
    this.redo(); // applies pushed entry
  }

  restoreFromServerRecords<TRecord extends HistoryServerRecord>(
    serverRecords: RevisionTailRecords<TRecord>,
    desiredRestoreCount: number,
    targetUserId?: string | symbol,
    recursive = true
  ): number | undefined {
    if (desiredRestoreCount <= 0) return 0;

    let potentialRestoreCount = 0;
    const relevantRecords: TRecord[] = [];
    for (let i = serverRecords.revisionToIndex(this._tailRevision); i >= 0; i--) {
      const record = serverRecords.records[i];
      if (!record) continue;
      relevantRecords.push(record);
      if (
        !targetUserId ||
        !('creatorUserId' in record) ||
        record.creatorUserId === targetUserId
      ) {
        potentialRestoreCount++;
        if (potentialRestoreCount >= desiredRestoreCount) {
          break;
        }
      }
    }
    relevantRecords.reverse();
    const firstRecord = relevantRecords[0];
    if (!firstRecord) return;

    const firstRecordIndex = serverRecords.revisionToIndex(firstRecord.revision);

    const newTailText = serverRecords.records
      .slice(0, firstRecordIndex)
      .reduce((a, b) => a.compose(b.changeset), serverRecords.tailText.changeset);

    const addedEntriesCount = this.restoreHistoryEntries(
      {
        changeset: newTailText,
        revision: firstRecord.revision - 1,
      },
      relevantRecords.map((record) => {
        const isOtherUser =
          targetUserId &&
          'creatorUserId' in record &&
          record.creatorUserId !== targetUserId;
        if (!record.beforeSelection || !record.afterSelection || isOtherUser) {
          return {
            isTail: true,
            execute: {
              changeset: record.changeset,
            },
          };
        } else {
          return {
            execute: {
              changeset: record.changeset,
              selection: record.afterSelection,
            },
            undo: {
              selection: record.beforeSelection,
            },
          };
        }
      })
    );

    let restoredCount = addedEntriesCount;

    const remainingCount = desiredRestoreCount - restoredCount;
    if (remainingCount > 0 && potentialRestoreCount > 0 && recursive) {
      const nextRestoredCount = this.restoreFromServerRecords(
        serverRecords,
        remainingCount,
        targetUserId,
        recursive
      );
      if (typeof nextRestoredCount === 'number') {
        restoredCount += nextRestoredCount;
      }
    }

    return restoredCount;
  }

  /**
   * @param tailText First element in {@link entries} is composable on {@link entries}.
   * @param entries Text entries.
   */
  restoreHistoryEntries(tailText: RevisionChangeset, entries: AnyEntry[]) {
    const beforeEntriesCount = this._entries.length;

    this.unshift(tailText.changeset, entries);

    this._tailRevision = tailText.revision;

    const addedEntriesCount = this._entries.length - beforeEntriesCount;
    this.lastExecutedIndex.server += addedEntriesCount;
    this.lastExecutedIndex.submitted += addedEntriesCount;
    this.lastExecutedIndex.local += addedEntriesCount;

    return addedEntriesCount;
  }

  undo() {
    const entry = this._entries[this.lastExecutedIndex.local];
    if (entry) {
      this.lastExecutedIndex.local--;
      this.applyTypingOperation(entry.undo);
    }
  }

  redo() {
    const entry = this._entries[this.lastExecutedIndex.local + 1];
    if (entry) {
      this.lastExecutedIndex.local++;
      this.applyTypingOperation(entry.execute);
    }
  }

  private applyTypingOperation(op: Operation) {
    this.client.composeLocalChange(op.changeset);
    this.eventBus.emit('appliedTypingOperation', { operation: op });
  }

  private adjustHistoryToExternalChange(externalChangeset: Changeset) {
    if (this.lastExecutedIndex.server >= 0) {
      this.composeOnAllEntries(externalChangeset, this.lastExecutedIndex.server);
    } else {
      this.composeOnAllEntries(externalChangeset, this.client.server);
    }
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

  /**
   * Merge entries into one. tailText is unmodified.
   */
  merge(startIndex: number, endIndex: number) {
    const mergedEntry = this._entries[endIndex];
    if (!mergedEntry) return false;
    for (let i = endIndex - 1; i >= startIndex; i--) {
      const olderEntry = this.getEntry(i);
      mergedEntry.execute.changeset = olderEntry.execute.changeset.compose(
        mergedEntry.execute.changeset
      );
      mergedEntry.undo.changeset = mergedEntry.undo.changeset.compose(
        olderEntry.undo.changeset
      );
    }

    this._entries = [
      ...this._entries.slice(0, startIndex),
      ...this._entries.slice(endIndex),
    ];

    for (let i = endIndex; i > startIndex; i--) {
      this.entryAtIndexDeleted(i);
    }

    return true;
  }

  /**
   * Merge entries into tailText. Merged entries become permanent and cannot be undone.
   */
  mergeToTail(count: number) {
    let mergedTailText = this._tailText;
    for (let i = 0; i < count; i++) {
      const nextEntry = this.getEntry(i);
      mergedTailText = mergedTailText.compose(nextEntry.execute.changeset);
    }

    this._entries = this._entries.slice(count);

    this._tailText = mergedTailText;

    for (let i = count - 1; i >= 0; i--) {
      this.entryAtIndexDeleted(i);
    }

    return true;
  }

  push(newEntries: AnyEntry[]) {
    let headText = this.getHeadText();

    newEntries.forEach((entry) => {
      if (!('isTail' in entry)) {
        const { execute, undo } = entry;
        this._entries.push({
          execute: {
            changeset: execute.changeset,
            selection: execute.selection,
          },
          undo: {
            changeset: undo.changeset ?? execute.changeset.inverse(headText),
            selection: undo.selection,
          },
        });
        headText = headText.compose(execute.changeset);
      } else {
        this.composeOnAllEntries(entry.execute.changeset, this._entries.length - 1);
      }
    });
  }

  unshift(newTailText: Changeset, newEntries: AnyEntry[]) {
    const resultEntries: Entry[] = [];
    // Compose isTails
    newEntries = newEntries.reduce<AnyEntry[]>((arr, b) => {
      const prev: AnyEntry | undefined = arr[arr.length - 1];
      const bothAreTails = prev && 'isTail' in prev && 'isTail' in b;
      if (bothAreTails) {
        prev.execute.changeset = prev.execute.changeset.compose(b.execute.changeset);
      } else {
        arr.push(b);
      }
      return arr;
    }, []);

    // Compose until newest entry and calc undo
    let currentText = newTailText;
    const newEntriesWithUndo: AnyEntryWithUndo[] = newEntries.map((entry) => {
      const undo = entry.execute.changeset.inverse(currentText);
      currentText = currentText.compose(entry.execute.changeset);
      if (entry.isTail) {
        return {
          ...entry,
          undo: {
            ...entry.undo,
            changeset: undo,
          },
        };
      } else {
        return {
          ...entry,
          undo: {
            ...entry.undo,
            changeset: undo,
          },
        };
      }
    });

    let tailComposition = this.tailComposition;
    for (let j = newEntriesWithUndo.length - 1; j >= 0; j--) {
      const swapEntry = newEntriesWithUndo[j];
      if (!swapEntry) {
        throw new Error('Expected entry to be defined');
      }
      currentText = currentText.compose(swapEntry.undo.changeset);

      if (swapEntry.isTail) {
        tailComposition = tailComposition
          ? swapEntry.execute.changeset.compose(tailComposition)
          : swapEntry.execute.changeset;
        continue;
      }

      if (!tailComposition) {
        resultEntries.push({
          execute: {
            changeset: swapEntry.execute.changeset,
            selection: swapEntry.execute.selection,
          },
          undo: {
            changeset: swapEntry.undo.changeset,
            selection: swapEntry.undo.selection,
          },
        });
        continue;
      }

      const newExecuteSelection = SelectionRange.followChangeset(
        swapEntry.execute.selection,
        tailComposition
      );
      const [newTailEntryExecute, newSwapEntryExecute] = currentText.swapChanges(
        swapEntry.execute.changeset,
        tailComposition
      );
      tailComposition = newTailEntryExecute;

      const newSwapEntryUndo = newSwapEntryExecute.inverse(
        currentText.compose(newTailEntryExecute)
      );

      const newUndoSelection = SelectionRange.followChangeset(
        swapEntry.undo.selection,
        newTailEntryExecute
      );

      resultEntries.push({
        execute: {
          changeset: newSwapEntryExecute,
          selection: newExecuteSelection,
        },
        undo: {
          changeset: newSwapEntryUndo,
          selection: newUndoSelection,
        },
      });
    }

    resultEntries.reverse();
    this._entries.unshift(...resultEntries);

    this._tailText = tailComposition ? newTailText.compose(tailComposition) : newTailText;
    this.tailComposition = tailComposition;

    this.deleteEmptyEntries();
  }

  private getEntry(index: number): Entry {
    const entry = this._entries[index];
    if (!entry) {
      throw new Error(`Expected an entry at index ${index}`);
    }
    return entry;
  }

  deleteNewerEntries(keepEntryIndex: number) {
    if (0 <= keepEntryIndex && keepEntryIndex < this._entries.length - 1) {
      this._entries = this._entries.slice(0, keepEntryIndex + 1);

      this.lastExecutedIndex.submitted = Math.min(
        this.lastExecutedIndex.submitted,
        keepEntryIndex
      );
      this.lastExecutedIndex.server = Math.min(
        this.lastExecutedIndex.server,
        this.lastExecutedIndex.submitted
      );
    }
  }

  /**
   *
   * @param changeset Changeset that was just composed on {@link newTailText}
   * @param newTailText Text that will replace current one.
   * All existing entries must be composable on {@link newTailText}.
   */
  composeOnAllEntries(changeset: Changeset, newTailText: Changeset): void;
  /**
   *
   * @param changeset Changeset to be composed on tailText
   * @param targetEntryIndex Index of entry where {@link changeset} is composable on.
   */
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  composeOnAllEntries(changeset: Changeset, targetEntryIndex: number): void;
  /**
   * A changeset was/is composed on tailText. Every entry will reflect that with either
   * deletions or retained characterrs.
   */
  composeOnAllEntries(
    changeset: Changeset,
    targetEntryIndexOrNewTailText: Changeset | number
  ) {
    let targetEntryIndex: number;
    if (targetEntryIndexOrNewTailText instanceof Changeset) {
      targetEntryIndex = -1;
      this._tailText = targetEntryIndexOrNewTailText;
    } else {
      targetEntryIndex = targetEntryIndexOrNewTailText;
      // Update execute before targetIndex (...,e0,e1,e2)
      this.executeTailComposedToIndex(changeset, targetEntryIndex);

      // Update selection before targetIndex (...,u0,u1,u2)
      this.undoTailComposedSelectionToIndex(changeset, targetEntryIndex);
    }

    // Update selection after targetIndex + 1 (u3,u4,...)
    this.undoTailComposedSelectionFromIndex(changeset, targetEntryIndex + 1);

    // Update execute after targetIndex + 1 (e3,e4,...)
    this.executeTailComposedFromIndex(changeset, targetEntryIndex + 1);

    this.calculateUndo();
    this.deleteEmptyEntries();
  }

  private executeTailComposedToIndex(changeset: Changeset, endIndex: number) {
    let tailComposable = Changeset.EMPTY;
    let followComposition = changeset;
    for (let i = endIndex; i >= 0; i--) {
      const entry = this.getEntry(i);

      entry.execute.selection = SelectionRange.followChangeset(
        entry.execute.selection,
        followComposition
      );

      const newTailComposable = entry.undo.changeset.follow(followComposition);
      entry.execute.changeset = entry.execute.changeset.findSwapNewSecondChange(
        followComposition,
        newTailComposable
      );
      followComposition = newTailComposable;
      tailComposable = newTailComposable;
    }

    this._tailText = this.tailText.compose(tailComposable);
  }

  private undoTailComposedSelectionToIndex(changeset: Changeset, endIndex: number) {
    let followComposition = changeset;
    for (let i = endIndex; i >= 0; i--) {
      const entry = this.getEntry(i);
      const undo = entry.undo.changeset;

      entry.undo.selection = SelectionRange.followChangeset(
        entry.undo.selection,
        followComposition
      );

      followComposition = undo.follow(followComposition);
    }
  }

  private undoTailComposedSelectionFromIndex(changeset: Changeset, startIndex: number) {
    let followComposition = changeset;
    for (let i = startIndex; i < this._entries.length; i++) {
      const entry = this.getEntry(i);

      entry.undo.selection = SelectionRange.followChangeset(
        entry.undo.selection,
        followComposition
      );

      followComposition = entry.execute.changeset.follow(followComposition);
    }
  }

  private executeTailComposedFromIndex(changeset: Changeset, startIndex: number) {
    let followComposition = changeset;
    for (let i = startIndex; i < this._entries.length; i++) {
      const entry = this.getEntry(i);
      const execute = entry.execute.changeset;
      entry.execute.changeset = followComposition.follow(execute);

      followComposition = execute.follow(followComposition);

      entry.execute.selection = SelectionRange.followChangeset(
        entry.execute.selection,
        followComposition
      );
    }
  }

  /**
   * Calculates new undo from tailText and execute.
   */
  private calculateUndo() {
    let currentText = this.tailText;
    for (const entry of this._entries) {
      const newUndo = entry.execute.changeset.inverse(currentText);
      entry.undo.changeset = newUndo;
      currentText = currentText.compose(entry.execute.changeset);
    }
  }

  /**
   * Deletes empty entries. An entry is considered empty if execute and undo changesets are equal.
   */
  private deleteEmptyEntries() {
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const entry = this.getEntry(i);
      if (entry.execute.changeset.isEqual(entry.undo.changeset)) {
        this._entries.splice(i, 1);
        this.entryAtIndexDeleted(i);
      }
    }
  }

  serialize(removeServerEntries = true): SerializedCollabHistory {
    let entries = this.entries;
    let lastExecutedIndex = this.lastExecutedIndex;
    if (removeServerEntries) {
      const offset = this.lastExecutedIndex.server + 1;
      entries = this._entries.slice(offset);
      lastExecutedIndex = {
        server: -1,
        submitted: this.lastExecutedIndex.submitted - offset,
        local: this.lastExecutedIndex.local - offset,
      };
    }

    return {
      entries: entries.map((entry) => ({
        execute: {
          ...entry.execute,
          changeset: entry.execute.changeset.serialize(),
        },
        undo: {
          ...entry.undo,
          changeset: entry.undo.changeset.serialize(),
        },
      })),
      tailRevision: this._tailRevision,
      tailText: this._tailText.serialize(),
      tailComposition: this.tailComposition?.serialize(),
      lastExecutedIndex,
    };
  }

  static parseValue(
    value: unknown
  ): Pick<
    CollabHistoryOptions,
    'entries' | 'tailRevision' | 'tailText' | 'lastExecutedIndex' | 'tailComposition'
  > {
    assertHasProperties(value, ['entries', 'lastExecutedIndex']);

    if (!Array.isArray(value.entries)) {
      throw new ParseError(
        `Expected 'entries' to be an array, found '${String(value.entries)}'`
      );
    }

    const valueOptional = value as {
      tailRevision?: unknown;
      tailText?: unknown;
      tailComposition?: unknown;
    };

    return {
      entries: value.entries.map((entry) => parseEntry(entry)),
      tailRevision: parseNumberMaybe(valueOptional.tailRevision),
      tailText: Changeset.parseValueMaybe(valueOptional.tailText),
      lastExecutedIndex: parseLastExecutedIndex(value.lastExecutedIndex),
      tailComposition: Changeset.parseValueMaybe(valueOptional.tailComposition),
    };
  }
}

function parseEntry(value: unknown): Entry {
  assertHasProperties(value, ['execute', 'undo']);

  return {
    execute: parseOperation(value.execute),
    undo: parseOperation(value.undo),
  };
}

function parseOperation(value: unknown): Operation {
  assertHasProperties(value, ['changeset', 'selection']);

  return {
    changeset: Changeset.parseValue(value.changeset),
    selection: SelectionRange.parseValue(value.selection),
  };
}

function parseLastExecutedIndex(value: unknown): LastExecutedIndex {
  assertHasProperties(value, ['server', 'submitted', 'local']);

  return {
    server: parseNumber(value.server),
    submitted: parseNumber(value.submitted),
    local: parseNumber(value.local),
  };
}