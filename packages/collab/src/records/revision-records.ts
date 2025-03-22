import { Changeset } from '../changeset';

import { RevisionRecord, RevisionChangeset } from './record';
import { RevisionArray } from './revision-array';

export interface RevisionRecordsOptions<
  TRecord extends Readonly<RevisionRecord> = RevisionRecord,
> {
  records?: readonly TRecord[];
  tailText?: Readonly<RevisionChangeset>;
}

/**
 * Changeset records with a tailText
 */
export class RevisionRecords<TRecord extends Readonly<RevisionRecord> = RevisionRecord> {
  private _records: TRecord[];

  private readonly revisionArray: RevisionArray<TRecord>;

  get headRevision() {
    return this.revisionArray.newestRevision ?? this._tailText.revision;
  }

  get items(): readonly TRecord[] {
    return this._records;
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

  constructor(params?: RevisionRecordsOptions<TRecord>) {
    this._records = [...(params?.records ?? [])];
    this._tailText = params?.tailText ?? {
      changeset: Changeset.EMPTY,
      revision: 0,
    };

    this.revisionArray = new RevisionArray(this._records);
  }

  push(record: TRecord) {
    this._records.push(record);
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
    if (revision <= 0) {
      return {
        revision: 0,
        changeset: Changeset.EMPTY,
      };
    }

    if (revision === this.tailRevision) {
      return this.tailText;
    }

    const index = this.revisionArray.revisionToIndex(revision);
    if (index === -1) {
      throw new Error(`Expected record at revision '${revision}'`);
    }

    return {
      changeset: this._records
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
    return this.revisionArray.revisionToIndex(revision);
  }

  indexToRevision(index: number) {
    return this.revisionArray.indexToRevision(index);
  }
}
