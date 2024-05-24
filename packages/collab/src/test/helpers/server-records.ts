import { RevisionChangeset, RevisionRecord } from '../../records/record';
import { ServerRecordsFacade } from '../../client/user-records';
import { ChangesetRevisionRecords } from '../../records/changeset-revision-records';

export interface LocalServerRecordsParams<TRecord extends RevisionRecord> {
  changesetRecords: ChangesetRevisionRecords<TRecord>;
}

/**
 * Records are stored directly in instance.
 */
export class LocalServerRecords<TRecord extends RevisionChangeset>
  implements ServerRecordsFacade<TRecord>
{
  readonly changesetRecords: ChangesetRevisionRecords<TRecord>;

  get tailText() {
    return this.changesetRecords.tailText;
  }

  constructor({ changesetRecords }: LocalServerRecordsParams<TRecord>) {
    this.changesetRecords = changesetRecords;
  }

  newestRecordsIterable(headRevision: number): Iterable<Readonly<TRecord>> {
    const headIndex = this.changesetRecords.revisionToIndex(headRevision);
    let index = headIndex;
    const records = headIndex >= 0 ? [...this.changesetRecords.records] : [];
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

  getHeadText() {
    return this.changesetRecords.getHeadText();
  }

  getTextAt(revision: number): Readonly<RevisionChangeset> {
    return this.changesetRecords.getTextAt(revision);
  }
}
