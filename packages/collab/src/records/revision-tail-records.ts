import { Changeset } from '../changeset/changeset';
import { RevisionChangeset, RevisionRecord } from './record';
import { RevisionRecords, RevisionRecordsOptions } from './revision-records';

export interface RevisionTailRecordsOptions<TRecord extends RevisionRecord>
  extends RevisionRecordsOptions<TRecord> {
  tailText?: RevisionChangeset;
}

/**
 * Records with a tailText
 */
export class RevisionTailRecords<
  TRecord extends RevisionRecord = RevisionRecord,
> extends RevisionRecords<TRecord> {
  constructor(options?: RevisionTailRecordsOptions<TRecord>) {
    super(options);

    this._tailText = options?.tailText ?? {
      changeset: Changeset.EMPTY,
      revision: 0,
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

  getTextAt(revision: number) {
    const index = this.revisionToIndex(revision + 1);
    if (index === -1) {
      throw new Error(`Expected to have record for revision ${revision}`);
    }

    return {
      changeset: this._records
        .slice(0, index)
        .reduce((a, b) => a.compose(b.changeset), this._tailText.changeset),
      revision,
    };
  }

  /**
   * Deletes all records. Resets tailText.
   */
  clear() {
    super.clear();
    this._tailText = {
      changeset: Changeset.EMPTY,
      revision: 0,
    };
  }
}
