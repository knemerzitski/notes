import mitt, { Emitter } from 'mitt';
import { Changeset } from '../changeset/changeset';

import { PartialBy } from '~utils/types';

export interface Operation {
  changeset: Changeset;
  selectionStart: number;
  selectionEnd: number;
}

export interface Entry {
  execute: Operation;
  undo: Operation;
}

export interface AddEntry {
  execute: PartialBy<Operation, 'selectionEnd'>;
  undo: PartialBy<Operation, 'changeset' | 'selectionEnd'>;
  isTail?: false;
}

export interface TailEntry {
  execute: Omit<Operation, 'selectionStart' | 'selectionEnd'>;
  undo?: Omit<PartialBy<Operation, 'changeset'>, 'selectionStart' | 'selectionEnd'>;
  /**
   * Entry is composed on tailDocument.
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

export interface TailDocumentHistoryOptions {
  tail?: Changeset;
  eventBus?: Emitter<Events>;
}

export class TailDocumentHistory {
  readonly eventBus: Emitter<Events>;

  private _entries: Entry[] = [];
  get entries(): Readonly<Entry[]> {
    return this._entries;
  }

  private _tailDocument = Changeset.EMPTY;
  /**
   * History entries are composed after this document.
   * As such, first history entry may contain retained characters to tailDocument.
   */
  get tailDocument() {
    return this._tailDocument;
  }

  private tailComposition: Changeset | undefined;

  constructor(options?: TailDocumentHistoryOptions) {
    if (options?.tail) {
      this._tailDocument = options.tail;
      if (!this._tailDocument.hasOnlyInsertions()) {
        throw new Error(
          `Expected tailDocument to be document but is ${String(this._tailDocument)}`
        );
      }
    }

    this.eventBus = options?.eventBus ?? mitt();
  }

  /**
   * Composition of tailDocument and all history execute changesets.
   */
  getHeadDocument() {
    return this.entries.reduce(
      (a, b) => a.compose(b.execute.changeset),
      this._tailDocument
    );
  }

  /**
   * Merge entries into one. Tail document is unmodified.
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
   * Merge entries into tail document. Merged entries become permanent and cannot be undone.
   */
  mergeToTail(count: number) {
    let mergedTailDocument = this._tailDocument;
    for (let i = 0; i < count; i++) {
      const nextEntry = this.getEntry(i);
      mergedTailDocument = mergedTailDocument.compose(nextEntry.execute.changeset);
    }

    this._entries = this._entries.slice(count);

    this._tailDocument = mergedTailDocument;

    for (let i = count - 1; i >= 0; i--) {
      this.eventBus.emit('entryAtIndexDeleted', {
        index: i,
      });
    }

    return true;
  }

  push(newEntries: AnyEntry[]) {
    let headDocument = this.getHeadDocument();

    newEntries.forEach((entry) => {
      if (!('isTail' in entry)) {
        const { execute, undo } = entry;
        this._entries.push({
          execute: {
            changeset: execute.changeset,
            selectionStart: execute.selectionStart,
            selectionEnd: execute.selectionEnd ?? execute.selectionStart,
          },
          undo: {
            changeset: undo.changeset ?? execute.changeset.inverse(headDocument),
            selectionStart: undo.selectionStart,
            selectionEnd: undo.selectionEnd ?? undo.selectionStart,
          },
        });
        headDocument = headDocument.compose(execute.changeset);
      } else {
        this.composeOnAllEntries(entry.execute.changeset, this._entries.length - 1);
      }
    });
  }

  unshift(newTailDocument: Changeset, newEntries: AnyEntry[]) {
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
    let currentDocument = newTailDocument;
    const newEntriesWithUndo: AnyEntryWithUndo[] = newEntries.map((entry) => {
      const undo = entry.execute.changeset.inverse(currentDocument);
      currentDocument = currentDocument.compose(entry.execute.changeset);
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
      currentDocument = currentDocument.compose(swapEntry.undo.changeset);

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
            selectionStart: swapEntry.execute.selectionStart,
            selectionEnd:
              swapEntry.execute.selectionEnd ?? swapEntry.execute.selectionStart,
          },
          undo: {
            changeset: swapEntry.undo.changeset,
            selectionStart: swapEntry.undo.selectionStart,
            selectionEnd: swapEntry.undo.selectionEnd ?? swapEntry.undo.selectionStart,
          },
        });
        continue;
      }

      const newExecuteSelectionStart = tailComposition.followIndex(
        swapEntry.execute.selectionStart
      );

      const newExecuteSelectionEnd = swapEntry.execute.selectionEnd
        ? tailComposition.followIndex(swapEntry.execute.selectionEnd)
        : newExecuteSelectionStart;

      const [newTailEntryExecute, newSwapEntryExecute] = currentDocument.swapChanges(
        swapEntry.execute.changeset,
        tailComposition
      );
      tailComposition = newTailEntryExecute;

      const newSwapEntryUndo = newSwapEntryExecute.inverse(
        currentDocument.compose(newTailEntryExecute)
      );

      const newUndoSelectionStart = newTailEntryExecute.followIndex(
        swapEntry.undo.selectionStart
      );
      const newUndoSelectionEnd = swapEntry.undo.selectionEnd
        ? newTailEntryExecute.followIndex(swapEntry.undo.selectionEnd)
        : newUndoSelectionStart;

      resultEntries.push({
        execute: {
          changeset: newSwapEntryExecute,
          selectionStart: newExecuteSelectionStart,
          selectionEnd: newExecuteSelectionEnd,
        },
        undo: {
          changeset: newSwapEntryUndo,
          selectionStart: newUndoSelectionStart,
          selectionEnd: newUndoSelectionEnd,
        },
      });
    }

    resultEntries.reverse();
    this._entries.unshift(...resultEntries);

    this._tailDocument = tailComposition
      ? newTailDocument.compose(tailComposition)
      : newTailDocument;
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
   * @param changeset Changeset that was just composed on {@link newTailDocument}
   * @param newTailDocument New tailDocument that will replace current one.
   * All existing entries must be composable on newTailDocument.
   */
  composeOnAllEntries(changeset: Changeset, newTailDocument: Changeset): void;
  /**
   *
   * @param changeset Changeset to be composed on tailDocument
   * @param targetEntryIndex Index of entry where {@link changeset} is composable on.
   */
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  composeOnAllEntries(changeset: Changeset, targetEntryIndex: number): void;
  /**
   * A changeset was/is composed on tailDocument. Every entry will reflect that with either
   * deletions or retained characterrs.
   */
  composeOnAllEntries(
    changeset: Changeset,
    targetEntryIndexOrNewTailDocument: Changeset | number
  ) {
    let targetEntryIndex: number;
    if (targetEntryIndexOrNewTailDocument instanceof Changeset) {
      targetEntryIndex = -1;
      this._tailDocument = targetEntryIndexOrNewTailDocument;
    } else {
      targetEntryIndex = targetEntryIndexOrNewTailDocument;
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
      entry.execute.selectionStart = followComposition.followIndex(
        entry.execute.selectionStart
      );

      entry.execute.selectionEnd = followComposition.followIndex(
        entry.execute.selectionEnd
      );

      const newTailComposable = entry.undo.changeset.follow(followComposition);
      entry.execute.changeset = entry.execute.changeset.findSwapNewSecondChange(
        followComposition,
        newTailComposable
      );
      followComposition = newTailComposable;
      tailComposable = newTailComposable;
    }

    this._tailDocument = this.tailDocument.compose(tailComposable);
  }

  private undoTailComposedSelectionToIndex(changeset: Changeset, endIndex: number) {
    let followComposition = changeset;
    for (let i = endIndex; i >= 0; i--) {
      const entry = this.getEntry(i);
      const undo = entry.undo.changeset;

      entry.undo.selectionStart = followComposition.followIndex(
        entry.undo.selectionStart
      );
      entry.undo.selectionEnd = followComposition.followIndex(entry.undo.selectionEnd);

      followComposition = undo.follow(followComposition);
    }
  }

  private undoTailComposedSelectionFromIndex(changeset: Changeset, startIndex: number) {
    let followComposition = changeset;
    for (let i = startIndex; i < this._entries.length; i++) {
      const entry = this.getEntry(i);

      entry.undo.selectionStart = followComposition.followIndex(
        entry.undo.selectionStart
      );
      entry.undo.selectionEnd = followComposition.followIndex(entry.undo.selectionEnd);

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

      entry.execute.selectionStart = followComposition.followIndex(
        entry.execute.selectionStart
      );
      entry.execute.selectionEnd = followComposition.followIndex(
        entry.execute.selectionEnd
      );
    }
  }

  /**
   * Calculates new undo from tailDocument and execute.
   */
  private calculateUndo() {
    let currentDocument = this.tailDocument;
    for (const entry of this._entries) {
      const newUndo = entry.execute.changeset.inverse(currentDocument);
      entry.undo.changeset = newUndo;
      currentDocument = currentDocument.compose(entry.execute.changeset);
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

/*
caret applies to X for undo
X^ * l1 * -l1
X * l1 * E0

X * E0' * l1' * -l1'

follow E0' to get caret forward by one

combine isTails: e2 * e3 * e4 = E0
calc composite: TC = T2 * l0 * l1 * E0
calc inverse: -l0, -l1, -E0
move all isTails to left:
T2 * l0 * l1 * E0  
[E0',l1'] = (T2 * l0).swap(l1,E0)
T2 * l0 * E0' * l1'
[E0'',l0'] = (T2).swap(l0,E0')
T2 * E0'' * l0' * l1'

set base: T2 * E0''
prepend to entries: l0', l1'
--
newTailDocument = T2
newEntries = [l0, l1, e2, e3, e4]




B*m0*e1 = B*e1'*m0'  | A*X*Y => A*Y'*X'
-m0 = i(m0,B)         | undoX = X.inverse(A)
e1' = f(-m0,e1)       | Y_ = undoX.follow(Y)
m0' = sw(m0,[e1,e1']) | X.findSwapSecondChange(Y,Y_)
[Y_, X_];

B*e1'*e3'' 

-e1' = i(e1',B)

m - mine
e - external
B*m0*e1*m2*e3*m4


- m0: add => base: B, records: [m0]
B*m0

- e1: swap (m0;e1) => B*e1'*m0' => base: B*e1', records: [m0']  
B*m0*e1
[e1',m0'] = (B).swap(m0,e1)
B*e1'*m0'

- m2: add => base: B*e1', records: [m0', m2]
B*e1'*m0'*m2

- e3: swap (m0',m2;e3) => B*e1'*e3' => base: B*e1'*e3'', records: [m0'', m2']  

B*e1'*m0'*m2*e3
[e3',m2'] = (B*e1'*m0').swap(m2,e3)
B*e1'*m0'*e3'*m2'
[e3'',m0''] = (B*e1').swap(m0',e3')
B*e1'*e3''*m0''*m2'

- m4: add => base: B*e1'*e3'', records: [m0'', m2', m4]
B*e1'*e3''*m0''*m2'*m4

- e5: 
  B*e1'*e3''*m0''*m2'*m4*e5
  [e5',m4'] = (B*e1'*e3''*m0''*m2').swap(m4,e5)
  B*e1'*e3''*m0''*m2'*e5'*m4'
  [e5'',m2''] = (B*e1'*e3''*m0'').swap(m2',e5')
  B*e1'*e3''*m0''*e5''*m2''*m4'
  [e5''',m0'''] = (B*e1'*e3'').swap(m0'',e5'')
  B*e1'*e3''*e5'''*m0'''*m2''*m4'

*/
