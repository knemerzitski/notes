import mitt, { Emitter } from '~utils/mitt-unsub';
import { Changeset } from '../changeset/changeset';

import { PartialBy } from '~utils/types';
import { SelectionRange } from './selection-range';

export interface Operation {
  changeset: Changeset;
  selection: SelectionRange;
}

export interface Entry {
  execute: Operation;
  undo: Operation;
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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Events = {
  entryAtIndexDeleted: {
    /**
     * Entry was in entries at this index
     */
    index: number;
  };
};

export interface TailTextHistoryOptions {
  tail?: Changeset;
  eventBus?: Emitter<Events>;
}

export class TailTextHistory {
  readonly eventBus: Emitter<Events>;

  private _entries: Entry[] = [];
  get entries(): Readonly<Entry[]> {
    return this._entries;
  }

  private _tailText = Changeset.EMPTY;
  /**
   * History entries are composed on this text.
   */
  get tailText() {
    return this._tailText;
  }

  private tailComposition: Changeset | undefined;

  constructor(options?: TailTextHistoryOptions) {
    if (options?.tail) {
      this._tailText = options.tail;
      if (!this._tailText.hasOnlyInsertions()) {
        throw new Error(
          `Expected tailText to only contain insertions but is ${String(this._tailText)}`
        );
      }
    }

    this.eventBus = options?.eventBus ?? mitt();
  }

  /**
   * Composition of tailText and all history execute changesets.
   */
  getHeadText() {
    return this.entries.reduce((a, b) => a.compose(b.execute.changeset), this._tailText);
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
      this.eventBus.emit('entryAtIndexDeleted', {
        index: i,
      });
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
      this.eventBus.emit('entryAtIndexDeleted', {
        index: i,
      });
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
    this._entries = this._entries.slice(0, keepEntryIndex + 1);
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
        this.eventBus.emit('entryAtIndexDeleted', {
          index: i,
        });
      }
    }
  }
}
