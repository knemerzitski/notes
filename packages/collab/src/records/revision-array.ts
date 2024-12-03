import { consecutiveOrderedSetIndexOf } from '~utils/ordered-set/consecutive-ordered-set';

import { Revision } from './record';

function rankRecord(record: Revision) {
  return record.revision;
}

/**
 * A helper class to access items with a consecutive revision property
 */
export class RevisionArray<TItem extends Readonly<Revision> = Revision> {
  private readonly _array: readonly TItem[];

  get newestRecord() {
    return this.at(-1);
  }

  get oldestRecord() {
    return this.at(0);
  }

  get newestRevision() {
    return this.newestRecord?.revision;
  }

  get oldestRevision() {
    return this.oldestRecord?.revision;
  }

  get length() {
    return this._array.length;
  }

  constructor(records: readonly TItem[] = []) {
    this._array = records;
  }

  revisionToIndex(revision: number) {
    return consecutiveOrderedSetIndexOf(this._array, revision, rankRecord);
  }

  indexToRevision(index: number) {
    return this.at(index)?.revision;
  }

  at(index: number) {
    if (index < 0) {
      index += this._array.length;
    }
    return this._array[index];
  }

  [Symbol.iterator]() {
    return this._array[Symbol.iterator];
  }
}
