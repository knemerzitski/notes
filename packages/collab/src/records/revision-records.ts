import mergedConsecutiveOrdered from '~utils/array/mergedConsecutiveOrdered';

import filter, { Filter } from '~filter/index';
import { RevisionRecord } from './record';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FilterEvents<TRecord> = {
  isExistingRecord: {
    /**
     * New record to be inserted.
     */
    newRecord: TRecord;
    /**
     * Existing record that {@link newRecord} is going to follow.
     */
    existingRecord: Readonly<TRecord>;
    /**
     * Set this to true if {@link newRecord} already exists and is equal to {@link existingRecord}
     */
    isExisting: boolean;
  };
  followRecord: {
    /**
     * New record that is following {@link existingRecord} and will be
     * inserted as new latest record.
     */
    newRecord: TRecord;
    /**
     * Existing record that was used for follow of {@link newRecord}
     */
    existingRecord: Readonly<TRecord>;
  };
};

interface RevisionRecordInsertion<TRecord> {
  processedRecord: TRecord;
  isExisting: boolean;
}

export interface RevisionRecordsOptions<TRecord extends RevisionRecord> {
  records?: TRecord[];
  filterBus?: Filter<FilterEvents<TRecord>>;
}

/**
 * Records contain an array of changesets [r0, r1, r2, ..., r3]
 * that are all composable in sequence R = r0 * r1 * r2 * ... * R3. \
 * Also keeps track of each changeset revision which allows
 * adding changes that are intendend for older records.
 */
export class RevisionRecords<TRecord extends RevisionRecord = RevisionRecord> {
  readonly filterBus: Filter<FilterEvents<TRecord>>;

  /**
   * Revision of the newest record.
   */
  get endRevision() {
    return this.indexToRevision(-1);
  }

  /**
   * Revision of first record.
   */
  get startRevision() {
    return this.indexToRevision(0);
  }

  protected _records: TRecord[];
  get records(): Readonly<TRecord[]> {
    return this._records;
  }

  constructor(options?: RevisionRecordsOptions<TRecord>) {
    this._records = [...(options?.records ?? [])];
    this.filterBus = options?.filterBus ?? filter();
  }

  /**
   * @returns Index of a record that has {@link revision}. -1 if record not found.
   */
  revisionToIndex(revision: number) {
    const lastRecord = this._records[this._records.length - 1];
    if (!lastRecord) return -1;

    const result = revision + (this._records.length - lastRecord.revision) - 1;
    if (result < 0 || result >= this._records.length) return -1;

    return result;
  }

  /**
   * @returns Record index to revision. Negative values count from end of array.
   * -1 is last record.
   */
  indexToRevision(index: number) {
    const lastRecord = this._records[this._records.length - 1];
    if (!lastRecord) return -1;

    if (index < 0) {
      index += this._records.length;
    }

    if (index < 0) {
      return -1;
    }

    const revision = index + (lastRecord.revision - this._records.length) + 1;
    if (revision > lastRecord.revision) return -1;

    return revision;
  }

  /**
   * Inserts new change to records that applies to a specific revision.
   * If it applies to an older revision then it's modified using follow so it can be composed as a last record.
   * @returns Newest inserted record.
   */
  insert(newRecord: TRecord): RevisionRecordInsertion<TRecord> {
    if (newRecord.revision > this.endRevision) {
      throw new Error(
        `Unexpected change ${String(newRecord.changeset)} at revision ${
          newRecord.revision
        } is newer than newest revision ${this.endRevision}.`
      );
    }

    const deltaRevision = newRecord.revision - this.endRevision;
    const startRecordIndex = this._records.length + deltaRevision;
    if (startRecordIndex < 0) {
      throw new Error(
        `Missing older records to insert change ${String(
          newRecord.changeset
        )} at revision ${newRecord.revision}. Oldest revision is ${this.startRevision}.`
      );
    }

    const newEndRecord: TRecord = {
      ...newRecord,
      revision: this.endRevision + 1,
    };
    let expectedNextRevision = newRecord.revision + 1;
    for (let i = startRecordIndex; i < this._records.length; i++) {
      const record = this._records[i];
      if (!record) continue;
      if (expectedNextRevision !== record.revision) {
        throw new Error(
          `Expected next record revision to be '${expectedNextRevision}' but is '${
            record.revision
          }' for ${String(record.changeset)} at revision ${record.revision}`
        );
      }

      // Stop early if record already exists
      const { isExisting } = this.filterBus.filter('isExistingRecord', {
        existingRecord: record,
        newRecord: newEndRecord,
        isExisting: false,
      });
      if (isExisting) {
        return {
          processedRecord: record,
          isExisting: true,
        };
      }

      // Follow changeset
      newEndRecord.changeset = record.changeset.follow(newEndRecord.changeset);
      this.filterBus.filter('followRecord', {
        existingRecord: record,
        newRecord: newEndRecord,
      });

      expectedNextRevision++;
    }

    this._records.push(newEndRecord);

    return {
      processedRecord: newEndRecord,
      isExisting: false,
    };
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

  deleteNewerRevisions(keepRevision: number) {
    const keepIndex = this.revisionToIndex(keepRevision);
    if (keepIndex < 0) return;

    this._records = this._records.slice(0, keepIndex + 1);
  }

  /**
   * Adds new records. Duplicate records are ignored. Gaps are not allowed between newRecords and this.records.
   * @param newRecords Consecutive ordered array of new records.
   * Throws error if records have no overlap
   */
  update(newRecords: Readonly<TRecord[]>) {
    const firstRecord = newRecords[0];
    const lastRecord = newRecords[newRecords.length - 1];
    if (!firstRecord || !lastRecord) return;

    if (
      lastRecord.revision + 1 < this.startRevision ||
      this.endRevision < firstRecord.revision - 1
    ) {
      throw new Error(
        `Expected newRecords to have overlap. newRecords: (${firstRecord.revision},${lastRecord.revision}), records: (${this.startRevision},${this.endRevision})`
      );
    }

    this.mergeNewRecords(newRecords);
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
   * Deletes all records.
   */
  clear() {
    this._records = [];
  }
}
