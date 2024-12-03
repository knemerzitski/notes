import mitt, { Emitter } from 'mitt';

import {
  ServerRecordsFacade,
  ServerRecordsFacadeEvents,
} from '../../client/user-records';
import { RevisionChangeset, RevisionRecord } from '../../records/record';
import { RevisionRecords } from '../../records/revision-records';

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
  get eventBus(): Pick<Emitter<ServerRecordsFacadeEvents<TRecord>>, 'on' | 'off'> {
    return this._eventBus;
  }

  readonly records: RevisionRecords<TRecord>;

  get tailText() {
    return this.records.tailText;
  }

  constructor({ records }: LocalServerRecordsParams<TRecord>) {
    this.records = records;
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

  getTextAt(revision: number): Readonly<RevisionChangeset> {
    return this.records.getTextAt(revision);
  }
}
