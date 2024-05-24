import { Changeset } from '../changeset/changeset';
import { RevisionChangeset, RevisionRecord } from './record';
import { RevisionRecordInsertion, RevisionRecords } from './revision-records';

export interface ChangesetRevisionRecordsParams<
  TRecord extends RevisionRecord = RevisionRecord,
  TInsertRecord extends TRecord = TRecord,
> {
  revisionRecords: RevisionRecords<TRecord, TInsertRecord>;
  tailText?: RevisionChangeset;
}

/**
 * Changeset records with a tailText
 */
export class ChangesetRevisionRecords<
  TRecord extends RevisionRecord = RevisionRecord,
  TInsertRecord extends TRecord = TRecord,
> {
  private revisionRecords: RevisionRecords<TRecord, TInsertRecord>;

  get records() {
    return this.revisionRecords.records;
  }

  constructor(params: ChangesetRevisionRecordsParams<TRecord, TInsertRecord>) {
    this.revisionRecords = params.revisionRecords;
    this._tailText = params.tailText ?? {
      changeset: Changeset.EMPTY,
      revision: 0,
    };
  }

  get headRevision() {
    return this.revisionRecords.newestRevision ?? this._tailText.revision;
  }

  get tailRevision() {
    return this._tailText.revision;
  }

  private _tailText: RevisionChangeset;

  /**
   * First record is composed on this text.
   */
  get tailText(): Readonly<RevisionChangeset> {
    return this._tailText;
  }

  /**
   * Merge oldest records into tailText. Merged records are deleted.
   */
  mergeToTail(count: number) {
    if (count <= 0) return;

    let mergedTailText = this._tailText.changeset;
    let expectedRevision = this._tailText.revision + 1;
    for (let i = 0; i < count; i++) {
      const record = this.revisionRecords.records[i];
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

    this.revisionRecords.records = this.revisionRecords.records.slice(count);

    this._tailText = {
      changeset: mergedTailText,
      revision: expectedRevision - 1,
    };
  }

  getTextAt(revision: number) {
    if (revision === this.tailRevision) {
      return this.tailText;
    }

    const index = this.revisionRecords.revisionToIndex(revision);
    if (index === -1) {
      throw new Error(`Expected record at revision '${revision}'`);
    }

    return {
      changeset: this.revisionRecords.records
        .slice(0, index + 1)
        .reduce((a, b) => a.compose(b.changeset), this._tailText.changeset),
      revision,
    };
  }

  /**
   * Composition of all records on tailText.
   */
  getHeadText(): RevisionChangeset {
    return this.getTextAt(this.headRevision);
  }

  revisionToIndex(revision: number) {
    return this.revisionRecords.revisionToIndex(revision);
  }

  indexToRevision(index: number) {
    return this.revisionRecords.indexToRevision(index);
  }

  /**
   * Insert new record that applies to revision specifid in {@link newRecord}.
   * Before the record is pushed to end, it's processed by all already existing future records.
   * Calls event 'processNewRecord'.
   */
  insert(newRecord: TInsertRecord): RevisionRecordInsertion<TRecord, TInsertRecord> {
    return this.revisionRecords.insert(newRecord);
  }
}
