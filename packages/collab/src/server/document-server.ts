import { Changeset } from '../changeset/changeset';
import { RevisionChangeset } from '../records/revision-changeset';

// TODO integrate revisionrecords from records dir
interface DocumentServerOptions {
  headText?: RevisionChangeset;
  records?: RevisionChangeset[];
}

export class DocumentServer {
  private _headText: RevisionChangeset;
  get headText(): Readonly<RevisionChangeset> {
    return this._headText;
  }
  private _records: RevisionChangeset[];
  get records(): Readonly<RevisionChangeset[]> {
    return this._records;
  }

  constructor(options?: DocumentServerOptions) {
    this._headText = options?.headText ?? {
      revision: -1,
      changeset: Changeset.EMPTY,
    };
    this._records = options?.records ?? [];
  }

  /**
   * Add new revision to the document. If change applies to an older revision then
   * it's modified so it can be composed on headText.
   * @returns New latest record that was just composed to headText.
   */
  addChange(change: RevisionChangeset) {
    if (change.revision > this._headText.revision) {
      throw new Error(
        `Unexpected change ${String(change.changeset)} at revision ${
          change.revision
        } is newer than headText revision ${this._headText.revision}.`
      );
    }

    const deltaRevision = change.revision - this._headText.revision;
    const firstRecordIndex = this._records.length + deltaRevision;
    if (firstRecordIndex < 0) {
      throw new Error(
        `Missing older records to add change ${String(change.changeset)} at revision ${
          change.revision
        }.`
      );
    }

    let followChangeset = change.changeset;
    let expectedRevision = change.revision + 1;
    for (let i = firstRecordIndex; i < this._records.length; i++) {
      const record = this._records[i];
      if (!record) continue;
      if (expectedRevision !== record.revision) {
        throw new Error(
          `Expected next record revision to be '${expectedRevision}' but is '${
            record.revision
          }' for ${String(change.changeset)} at revision ${change.revision}`
        );
      }

      followChangeset = record.changeset.follow(followChangeset);
      expectedRevision++;
    }

    const latestRecord: RevisionChangeset = {
      changeset: followChangeset,
      revision: this._headText.revision + 1,
    };
    this._records.push(latestRecord);

    this._headText = {
      changeset: this._headText.changeset.compose(latestRecord.changeset),
      revision: latestRecord.revision,
    };

    return latestRecord;
  }
}
