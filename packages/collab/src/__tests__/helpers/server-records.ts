import mitt, { Emitter, ReadEmitter } from 'mitt';

import { Maybe } from '../../../../utils/src/types';

import { RevisionChangeset, RevisionRecord } from '../../records/record';
import { RevisionRecords } from '../../records/revision-records';
import { ServerRecordsFacadeEvents, ServerRecordsFacade } from '../../types';

export interface LocalServerRecordsParams<TRecord extends RevisionRecord> {
  records: RevisionRecords<TRecord>;
}

/**
 * Records are stored directly in instance.
 */
export class LocalServerRecords<TRecord extends RevisionRecord>
  implements ServerRecordsFacade<TRecord>
{
  private readonly _eventBus: Emitter<ServerRecordsFacadeEvents<TRecord>> = mitt();
  get eventBus(): ReadEmitter<ServerRecordsFacadeEvents<TRecord>> {
    return this._eventBus;
  }

  readonly records: RevisionRecords<TRecord>;

  get tailText() {
    return this.records.tailText;
  }

  constructor({ records }: LocalServerRecordsParams<TRecord>) {
    this.records = records;
  }

  hasMoreRecords(): boolean {
    // newestRecordsIterable will always return all records
    return false;
  }

  newestRecordsIterable(headRevision: number): Iterable<Readonly<TRecord>> {
    const headIndex = this.records.revisionToIndex(headRevision);
    let index = headIndex;
    const records = headIndex >= 0 ? [...this.records.items] : [];
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
    return this.records.getHeadText();
  }

  getTextAtMaybe(revision: number): Maybe<Readonly<RevisionChangeset>> {
    try {
      return this.getTextAt(revision);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  getTextAt(revision: number): Readonly<RevisionChangeset> {
    return this.records.getTextAt(revision);
  }
}
