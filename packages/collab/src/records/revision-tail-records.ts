import { ParseError, Serializable, assertHasProperties } from '~utils/serialize';
import { Changeset, SerializedChangeset } from '../changeset/changeset';
import { RevisionChangeset, RevisionRecord, SerializedRevisionChangeset } from './record';
import { RevisionRecords, RevisionRecordsOptions } from './revision-records';

export interface RevisionTailRecordsOptions<
  TRecord extends RevisionRecord,
  TSerializedRecord extends RevisionRecord<SerializedChangeset>,
> extends RevisionRecordsOptions<TRecord> {
  tailText?: RevisionChangeset;
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
    super(options);
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

  get endRevision() {
    return this._records.length > 0 ? super.endRevision : this.tailRevision;
  }

  get startRevision() {
    return this._records.length > 0 ? super.startRevision : this.tailRevision;
  }

  get headRevision() {
    return this.endRevision;
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
  update(newRecords: Readonly<TRecord[]>, newTailText?: RevisionChangeset) {
    super.update(newRecords);

    if (newTailText) {
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
    } else {
      this._tailText = {
        changeset: Changeset.EMPTY,
        revision: -1,
      };
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
    parseRecord: (record: unknown) => T
  ): Pick<RevisionTailRecordsOptions<T, U>, 'tailText' | 'records'> {
    assertHasProperties(value, ['tailText', 'records']);

    if (!Array.isArray(value.records)) {
      throw new ParseError(
        `Expected 'records' to be an array, found '${String(value.records)}'`
      );
    }

    return {
      tailText: RevisionChangeset.parseValue(value.tailText),
      records: value.records.map((record) => parseRecord(record)),
    };
  }
}
