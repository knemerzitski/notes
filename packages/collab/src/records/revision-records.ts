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

  private _tailDocument: RevisionChangeset = {
    changeset: Changeset.EMPTY,
    revision: -1,
  };

  /**
   * First record is composed on this document.
   */
  get tailDocument() {
    return this._tailDocument;
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

    const result = revision + (this._records.length - lastRecord.change.revision) - 1;
    if (result < 0 || result >= this._records.length) return -1;

    return result;
  }

  indexToRevision(index: number) {
    const lastRecord = this._records[this._records.length - 1];
    if (!lastRecord) return -1;

    if (index < 0) {
      index += this._records.length;
    }

    return index + (lastRecord.change.revision - this._records.length) + 1;
  }

  /**
   * Inserts new change to records that applies to a specific revision.
   * If it applies to an older revision then it's modified using follow so it can be composed as a last record.
   * @returns Newest inserted record in records.
   */
  insert(newRecord: TRecord): TRecord {
    if (newRecord.change.revision > this.headRevision) {
      throw new Error(
        `Unexpected change ${String(newRecord.change.changeset)} at revision ${
          newRecord.change.revision
        } is newer than headRevision ${this.headRevision}.`
      );
    }

    const deltaRevision = newRecord.change.revision - this.headRevision;
    const startRecordIndex = this._records.length + deltaRevision;
    if (startRecordIndex < 0) {
      throw new Error(
        `Missing older records to insert change ${String(
          newRecord.change.changeset
        )} at revision ${newRecord.change.revision}.`
      );
    }

    const newHeadRecord: TRecord = {
      ...newRecord,
      revision: this.headRevision + 1,
    };
    let expectedRevision = newRecord.change.revision + 1;
    for (let i = startRecordIndex; i < this._records.length; i++) {
      const record = this._records[i];
      if (!record) continue;
      if (expectedRevision !== record.change.revision) {
        throw new Error(
          `Expected next record revision to be '${expectedRevision}' but is '${
            record.change.revision
          }' for ${String(record.change.changeset)} at revision ${record.change.revision}`
        );
      }

      newHeadRecord.change.changeset = record.change.changeset.follow(
        newHeadRecord.change.changeset
      );
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
   * @param newTailDocument Required if it contains records older than current tailDocument.revision.
   * @returns Records added successfully.
   */
  update(newRecords: Readonly<TRecord[]>, newTailDocument?: RevisionChangeset) {
    const firstRecord = newRecords[0];
    if (!firstRecord) return;

    if (newTailDocument) {
      if (newTailDocument.revision < this.tailDocument.revision) {
        if (newTailDocument.revision + 1 !== firstRecord.change.revision) {
          throw new Error(
            `Expected firstRecord revision ${firstRecord.change.revision} to be right after newTailDocument revision ${newTailDocument.revision}.`
          );
        }

        if (this.mergeNewRecords(newRecords)) {
          this._tailDocument = newTailDocument;
          return;
        }
      }
    } else {
      // Ensure first record isn't too old if newTailDocument isn't specified
      if (firstRecord.change.revision <= this.tailDocument.revision) {
        throw new Error(
          `Expected firstRecord revision (${firstRecord.change.revision}) to be higher than tailDocument revision (${this.tailDocument.revision}) since newTailDocument isn't specified.`
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
      (record) => record.change.revision
    );
    if (!mergedRecords) return false;

    this._records = mergedRecords;
    return true;
  }

  /**
   * Deletes all records. Resets tailDocument.
   */
  clear() {
    this._records = [];
    this._tailDocument = {
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
   * Merge records into tail document. Merged records are deleted.
   */
  mergeToTail(count: number) {
    if (count <= 0) return;

    let mergedTailDocument = this._tailDocument.changeset;
    let expectedRevision = this._tailDocument.revision + 1;
    for (let i = 0; i < count; i++) {
      const record = this._records[i];
      if (!record) continue;
      if (expectedRevision !== record.change.revision) {
        throw new Error(
          `Expected next record revision to be '${expectedRevision}' but is '${
            record.change.revision
          }' for ${String(record.change.changeset)} at revision ${record.change.revision}`
        );
      }
      mergedTailDocument = mergedTailDocument.compose(record.change.changeset);
      expectedRevision++;
    }

    this._records = this._records.slice(count);

    this._tailDocument = {
      changeset: mergedTailDocument,
      revision: expectedRevision - 1,
    };
  }

  /**
   * Composition of tailDocument all record revision.
   */
  getHeadDocument() {
    return this.records.reduce(
      (a, b) => a.compose(b.change.changeset),
      this._tailDocument.changeset
    );
  }
}