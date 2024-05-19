import { Changeset } from '../changeset/changeset';
import { RevisionChangeset } from './record';
import { consecutiveArrayIndexOf } from '~utils/array/consecutive-array';
import findSpliceConsecutiveArray from '~utils/array/findSpliceConsecutiveArray';

/**
 * Interface for querying server records.
 */
export interface ServerRecords<TRecord> {
  /**
   * tailText before oldest known record.
   */
  readonly tailText: RevisionChangeset;

  /**
   * Iterates through records from newest (headRevision) to oldest
   */
  newestRecordsIterable(headRevision: number): Iterable<Readonly<TRecord>>;

  /**
   * Get text at specific revision
   */
  getTextAt(revision: number): Readonly<RevisionChangeset>;
}

export interface LocalServerRecordsOptions<TRecord> {
  records?: TRecord[];
  tailText?: RevisionChangeset;
}

/**
 * Records are stored directly in instance.
 */
export class LocalServerRecords<TRecord extends RevisionChangeset>
  implements ServerRecords<TRecord>
{
  private records: TRecord[];

  private _tailText: RevisionChangeset;
  get tailText() {
    return this._tailText;
  }

  constructor(options?: LocalServerRecordsOptions<TRecord>) {
    this.records = options?.records ?? [];
    this._tailText = options?.tailText ?? {
      changeset: Changeset.EMPTY,
      revision: 0,
    };
  }

  private indexOfRevision(revision: number) {
    return consecutiveArrayIndexOf(this.records, revision, ({ revision }) => revision);
  }

  update(newRecords: Readonly<TRecord[]>, newTailText?: RevisionChangeset) {
    const splice = findSpliceConsecutiveArray(
      this.records,
      newRecords,
      (a, b) => a.revision - b.revision
    );
    if (splice) {
      this.records.splice(splice.start, splice.deleteCount, ...splice.items);
      if (newTailText) {
        this._tailText = newTailText;
        const firstRecord = this.records[0];
        if (firstRecord) {
          if (this._tailText.revision + 1 !== firstRecord.revision) {
            throw new Error(
              `Expected newTailText revision ${this._tailText.revision} to be right before first record revision ${firstRecord.revision}.`
            );
          }
        }
      } else {
        const firstRecord = this.records[0];
        if (firstRecord) {
          if (firstRecord.revision === 1) {
            this._tailText = {
              changeset: Changeset.EMPTY,
              revision: 0,
            };
          } else if (firstRecord.revision <= this.tailText.revision) {
            throw new Error(
              'Update to LocalServerRecords with older records requires newTailText'
            );
          }
        }
      }
    }
  }

  newestRecordsIterable(headRevision: number): Iterable<Readonly<TRecord>> {
    let index = this.indexOfRevision(headRevision);
    const records = [...this.records];
    return {
      [Symbol.iterator]: () => ({
        next: () => {
          const value = records[index--];
          if (value != null) {
            return {
              done: false,
              value,
            };
          } else {
            return { done: true, value };
          }
        },
      }),
    };
  }

  getTextAt(revision: number): Readonly<RevisionChangeset> {
    if (revision <= this.tailText.revision) return this.tailText;

    const index = this.indexOfRevision(revision);
    if (index === -1) {
      throw new Error(`Expected to have record at revision ${revision}`);
    }

    return {
      changeset: this.records
        .slice(0, index + 1)
        .reduce((a, b) => a.compose(b.changeset), this._tailText.changeset),
      revision,
    };
  }
}
