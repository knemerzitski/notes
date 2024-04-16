import mergedConsecutiveOrdered from '~utils/array/mergedConsecutiveOrdered';
import { Changeset } from '../changeset/changeset';

import filter, { Filter } from '~filter/index';
import { RevisionChangeset } from './revision-changeset';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FilterEvents<TRecord> = {
  followRecord: {
    /**
     * Modify this record
     */
    follow: TRecord;
    /**
     * Record that is being used to modify follow.
     */
    record: Readonly<TRecord>;
  };
};

export type Record<T = Changeset> = RevisionChangeset<T>;

interface RevisionRecordsOptions<TRecord extends Record> {
  records?: TRecord[];
  filterBus?: Filter<FilterEvents<TRecord>>;
}

/**
 * An array of changesets [r0, r1, r2, ..., r3]
 * that are all composable in sequence R = r0 * r1 * r2 * ... * R3. \
 * Also keeps track of each changeset revision which allows
 * adding changes that are intented for older records.
 */
export class RevisionRecords<TRecord extends Record = Record> {
  readonly filterBus: Filter<FilterEvents<TRecord>>;

  get headRevision() {
    return this.indexToRevision(-1);
  }

  get tailRevision() {
    return this.indexToRevision(0);
  }

  private _tailText: RevisionChangeset = {
    changeset: Changeset.EMPTY,
    revision: -1,
  };

  /**
   * First record is composed on this text.
   */
  get tailText() {
    return this._tailText;
  }

  private _records: TRecord[];
  get records(): Readonly<TRecord[]> {
    return this._records;
  }

  constructor(options?: RevisionRecordsOptions<TRecord>) {
    this._records = [...(options?.records ?? [])];
    this.filterBus = options?.filterBus ?? filter();
  }

  revisionToIndex(revision: number) {
    const lastRecord = this._records[this._records.length - 1];
    if (!lastRecord) return -1;

    const result = revision + (this._records.length - lastRecord.revision) - 1;
    if (result < 0 || result >= this._records.length) return -1;

    return result;
  }

  indexToRevision(index: number) {
    const lastRecord = this._records[this._records.length - 1];
    if (!lastRecord) return -1;

    if (index < 0) {
      index += this._records.length;
    }

    return index + (lastRecord.revision - this._records.length) + 1;
  }

  /**
   * Inserts new change to records that applies to a specific revision.
   * If it applies to an older revision then it's modified using follow so it can be composed as a last record.
   * @returns Newest inserted record in records.
   */
  insert(newRecord: TRecord): TRecord {
    if (newRecord.revision > this.headRevision) {
      throw new Error(
        `Unexpected change ${String(newRecord.changeset)} at revision ${
          newRecord.revision
        } is newer than headRevision ${this.headRevision}.`
      );
    }

    const deltaRevision = newRecord.revision - this.headRevision;
    const startRecordIndex = this._records.length + deltaRevision;
    if (startRecordIndex < 0) {
      throw new Error(
        `Missing older records to insert change ${String(
          newRecord.changeset
        )} at revision ${newRecord.revision}.`
      );
    }

    const newHeadRecord: TRecord = {
      ...newRecord,
      revision: this.headRevision + 1,
    };
    let expectedRevision = newRecord.revision + 1;
    for (let i = startRecordIndex; i < this._records.length; i++) {
      const record = this._records[i];
      if (!record) continue;
      if (expectedRevision !== record.revision) {
        throw new Error(
          `Expected next record revision to be '${expectedRevision}' but is '${
            record.revision
          }' for ${String(record.changeset)} at revision ${record.revision}`
        );
      }

      newHeadRecord.changeset = record.changeset.follow(newHeadRecord.changeset);
      this.filterBus.filter('followRecord', { record, follow: newHeadRecord });

      expectedRevision++;
    }

    this._records.push(newHeadRecord);

    return newHeadRecord;
  }

  /**
   *
   * @param startRevision Start revision that's included in slice.
   * @param endRevision End revision that's included in slice.
   */
  sliceByRevision(startRevision: number, endRevision?: number) {
    const startIndex = this.revisionToIndex(startRevision);
    if (startIndex === -1) return [];
    const endIndex = endRevision ? this.revisionToIndex(endRevision) + 1 : undefined;
    if (endIndex === -1) return [];

    return this.records.slice(startIndex, endIndex);
  }

  /**
   * Adds new records. Duplicate records are ignored.
   * @param newRecords Consecutive ordered array of new records.
   * @param newTailText Required if it contains records older than current tailText.revision.
   * @returns Records added successfully.
   */
  update(newRecords: Readonly<TRecord[]>, newTailText?: RevisionChangeset) {
    const firstRecord = newRecords[0];
    if (!firstRecord) return;

    if (newTailText) {
      if (newTailText.revision < this.tailText.revision) {
        if (newTailText.revision + 1 !== firstRecord.revision) {
          throw new Error(
            `Expected firstRecord revision ${firstRecord.revision} to be right after newTailText revision ${newTailText.revision}.`
          );
        }

        if (this.mergeNewRecords(newRecords)) {
          this._tailText = newTailText;
          return;
        }
      }
    } else {
      // Ensure first record isn't too old if newTailText isn't specified
      if (firstRecord.revision <= this.tailText.revision) {
        throw new Error(
          `Expected firstRecord revision (${firstRecord.revision}) to be higher than tailText revision (${this.tailText.revision}) since newTailText isn't specified.`
        );
      }

      this.mergeNewRecords(newRecords);
      return;
    }

    return false;
  }

  private mergeNewRecords(newRecords: Readonly<TRecord[]>) {
    const mergedRecords = mergedConsecutiveOrdered(
      this._records,
      newRecords,
      (record) => record.revision
    );
    if (!mergedRecords) return false;

    this._records = mergedRecords;
    return true;
  }

  /**
   * Deletes all records. Resets tailText.
   */
  clear() {
    this._records = [];
    this._tailText = {
      changeset: Changeset.EMPTY,
      revision: -1,
    };
  }

  deleteNewerRevisions(keepRevision: number) {
    const keepIndex = this.revisionToIndex(keepRevision);
    if (keepIndex < 0) return;

    this._records = this._records.slice(0, keepIndex + 1);
  }

  /**
   * Merge records into tailText. Merged records are deleted.
   */
  mergeToTail(count: number) {
    if (count <= 0) return;

    let mergedTailText = this._tailText.changeset;
    let expectedRevision = this._tailText.revision + 1;
    for (let i = 0; i < count; i++) {
      const record = this._records[i];
      if (!record) continue;
      if (expectedRevision !== record.revision) {
        throw new Error(
          `Expected next record revision to be '${expectedRevision}' but is '${
            record.revision
          }' for ${String(record.changeset)} at revision ${record.revision}`
        );
      }
      mergedTailText = mergedTailText.compose(record.changeset);
      expectedRevision++;
    }

    this._records = this._records.slice(count);

    this._tailText = {
      changeset: mergedTailText,
      revision: expectedRevision - 1,
    };
  }

  /**
   * Composition of all records on tailText.
   */
  getHeadText() {
    return this.records.reduce(
      (a, b) => a.compose(b.changeset),
      this._tailText.changeset
    );
  }
}
