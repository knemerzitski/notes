import { mitt, Emitter } from '~utils/mitt-unsub';
import { consecutiveOrderedSetIndexOf } from '~utils/ordered-set/consecutive-ordered-set';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RevisionRecordsEvents<TRecord, TInsertRecord> = {
  processNewRecord: {
    /**
     * New record to be inserted. Must update it with {@link existingRecords}.
     */
    newRecord: TInsertRecord;
    /**
     * Existing record that has already been inserted after {@link newRecord}.
     */
    existingRecord: Readonly<TRecord>;
    /**
     * Set true if {@link newRecord} is a duplicate of {@link existingRecord}.
     * Further record's wont be processed and {@link existingRecord} is returned instead.
     */
    isDuplicate: boolean;
  };
};

export interface Revision {
  revision: number;
}

export type RevisionRecordInsertion<TRecord, TInsertRecord> =
  | {
      processedRecord: TRecord;
      isExisting: true;
    }
  | {
      processedRecord: TInsertRecord;
      isExisting: false;
    };

export interface RevisionRecordsOptions<
  TRecord extends Revision = Revision,
  TInsertRecord extends TRecord = TRecord,
> {
  records?: TRecord[];
  eventBus?: Emitter<RevisionRecordsEvents<TRecord, TInsertRecord>>;
}

function rankRecord(record: Revision) {
  return record.revision;
}

/**
 * An array of immutable records.
 */
export class RevisionRecords<
  TRecord extends Revision = Revision,
  TInsertRecord extends TRecord = TRecord,
> {
  readonly eventBus: Emitter<RevisionRecordsEvents<TRecord, TInsertRecord>>;

  records: TRecord[];

  get newestRevision() {
    return this.indexToRevision(-1);
  }

  get oldestRevision() {
    return this.indexToRevision(0);
  }

  constructor(options?: RevisionRecordsOptions<TRecord, TInsertRecord>) {
    this.records = [...(options?.records ?? [])];
    this.eventBus = options?.eventBus ?? mitt();
  }

  revisionToIndex(revision: number) {
    return consecutiveOrderedSetIndexOf(this.records, revision, rankRecord);
  }

  indexToRevision(index: number) {
    if (index < 0) {
      index += this.records.length;
    }
    return this.records[index]?.revision;
  }

  /**
   * Insert new record that applies to revision specifid in {@link newRecord}.
   * Before the record is pushed to end, it's processed by all already existing future records.
   * Calls event 'processNewRecord'.
   */
  insert(newRecord: TInsertRecord): RevisionRecordInsertion<TRecord, TInsertRecord> {
    const newestRevision = this.newestRevision ?? newRecord.revision;
    if (newRecord.revision > newestRevision) {
      throw new Error(
        `Insert record '${newRecord.revision}' cannot be newer than newest record ${newestRevision}`
      );
    }

    const deltaRevision = newRecord.revision - newestRevision;
    const startRecordIndex = this.records.length + deltaRevision;
    if (startRecordIndex < 0) {
      throw new Error(
        `Missing older records to insert record '${newRecord.revision}'. Oldest record is '${this.oldestRevision}'.`
      );
    }

    const resultRecord: TInsertRecord = {
      ...newRecord,
      revision: newestRevision + 1,
    };
    let expectedNextRevision = newRecord.revision + 1;
    for (let i = startRecordIndex; i < this.records.length; i++) {
      const record = this.records[i];
      if (!record) continue;
      if (expectedNextRevision !== record.revision) {
        throw new Error(
          `Expected next record '${expectedNextRevision}' but is '${record.revision}'`
        );
      }

      const eventPayload: RevisionRecordsEvents<
        TRecord,
        TInsertRecord
      >['processNewRecord'] = {
        existingRecord: record,
        newRecord: resultRecord,
        isDuplicate: false,
      };
      this.eventBus.emit('processNewRecord', eventPayload);
      if (eventPayload.isDuplicate) {
        return {
          processedRecord: record,
          isExisting: true,
        };
      }

      expectedNextRevision++;
    }

    this.records.push(resultRecord);

    return {
      processedRecord: resultRecord,
      isExisting: false,
    };
  }
}
