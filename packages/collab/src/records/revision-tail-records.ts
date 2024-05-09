import {
  ParseError,
  Serializable,
  assertHasProperties,
} from '~utils/serialize';
import { Changeset, SerializedChangeset } from '../changeset/changeset';
import { RevisionChangeset, RevisionRecord, SerializedRevisionChangeset } from './record';
import { RevisionRecords, RevisionRecordsOptions } from './revision-records';

export interface RevisionTailRecordsOptions<
  TRecord extends RevisionRecord,
  TSerializedRecord extends RevisionRecord<SerializedChangeset>,
> {
  tailText?: RevisionChangeset;
  records?: RevisionRecordsOptions<TRecord>;
  serializeRecord: (record: TRecord) => TSerializedRecord;
}

export interface SerializedRevisionTailRecords<
  TSerializedRecord extends
    RevisionRecord<SerializedChangeset> = RevisionRecord<SerializedChangeset>,
> {
  tailText: SerializedRevisionChangeset;
  records: TSerializedRecord[];
}

/**
 * Records with a tailText
 */
export class RevisionTailRecords<
    TRecord extends RevisionRecord = RevisionRecord,
    TSerializedRecord extends
      RevisionRecord<SerializedChangeset> = RevisionRecord<SerializedChangeset>,
  >
  extends RevisionRecords<TRecord>
  implements Serializable<SerializedRevisionTailRecords<TSerializedRecord>>
{
  private serializeRecord: (record: TRecord) => TSerializedRecord;

  constructor(options: RevisionTailRecordsOptions<TRecord, TSerializedRecord>) {
    super(options?.records);
    this.serializeRecord = options?.serializeRecord;

    this._tailText = options?.tailText ?? {
      changeset: Changeset.EMPTY,
      revision: -1,
    };

    if (!this._tailText.changeset.hasOnlyInsertions()) {
      throw new Error(
        `Expected tailText to only contain insertions but is ${String(this._tailText)}`
      );
    }
  }

  get headRevision() {
    return this.indexToRevision(-1);
  }

  get tailRevision() {
    return this._tailText.revision;
  }

  private _tailText: RevisionChangeset;

  /**
   * First record is composed on this text.
   */
  get tailText() {
    return this._tailText;
  }

  /**
   * Composition of all records on tailText.
   */
  getHeadText(): RevisionChangeset {
    return {
      revision: this.headRevision,
      changeset: this.records.reduce(
        (a, b) => a.compose(b.changeset),
        this._tailText.changeset
      ),
    };
  }

  /**
   * Adds new records. Duplicate records are ignored.
   * @param newRecords Consecutive ordered array of new records.
   * @param newTailText Required if it contains records older than current tailText.revision.
   * @returns Records added successfully.
   */
  updateWithTailText(newTailText: RevisionChangeset, newRecords: Readonly<TRecord[]>) {
    this.update(newRecords);

    if (newTailText.revision < this.tailText.revision) {
      this._tailText = newTailText;
    }

    const firstRecord = this._records[0];

    if (firstRecord) {
      if (this._tailText.revision + 1 !== firstRecord.revision) {
        throw new Error(
          `Expected newTailText revision ${this._tailText.revision} to be right before first record revision ${firstRecord.revision}.`
        );
      }
    }
  }

  /**
   * Merge oldest records into tailText. Merged records are deleted.
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
   * Deletes all records. Resets tailText.
   */
  clear() {
    super.clear();
    this._tailText = {
      changeset: Changeset.EMPTY,
      revision: -1,
    };
  }

  serialize(): SerializedRevisionTailRecords<TSerializedRecord> {
    return {
      tailText: RevisionChangeset.serialize(this._tailText),
      records: this.records.map((record) => this.serializeRecord(record)),
    };
  }

  static parseValue<
    T extends RevisionRecord = RevisionRecord,
    U extends RevisionRecord<SerializedChangeset> = RevisionRecord<SerializedChangeset>,
  >(
    value: unknown,
    parseRecord: (record: unknown) => T,
    options: Omit<RevisionTailRecordsOptions<T, U>, 'tailText' | 'records'> & {
      records?: Omit<RevisionTailRecordsOptions<T, U>['records'], 'records'>;
    }
  ): RevisionTailRecords<T, U> | null {
    assertHasProperties(value, ['tailText', 'records']);

    if (!Array.isArray(value.records)) {
      throw new ParseError(
        `Expected 'records' to be an array, found '${String(value.records)}'`
      );
    }

    return new RevisionTailRecords<T, U>({
      tailText: RevisionChangeset.parseValue(value.tailText),
      ...options,
      records: {
        ...options.records,
        records: value.records.map((record) => parseRecord(record)),
      },
    });
  }
}
