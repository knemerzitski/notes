import { Changeset, RevisionChangeset } from './changeset';

interface ChangesetRecordsOptions {
  latestRevision?: number;
  records?: RevisionChangeset[];
}

/**
 * An array of changesets [C0, C1, C2, ..., C3]
 * that are all composable in sequence C0 * C1 * C2 * ... * C3. \
 * Also keeps track of each changeset revision which allows
 * adding changes that are intented for older records.
 */
export class ChangesetRevisionRecords {
  private _latestRevision: number;
  get latestRevision() {
    return this._latestRevision;
  }

  get oldestRevision() {
    return this.indexToRevision(0);
  }

  private _records: RevisionChangeset[];
  get records(): Readonly<RevisionChangeset[]> {
    return this._records;
  }

  constructor(options?: ChangesetRecordsOptions) {
    this._latestRevision = options?.latestRevision ?? -1;
    this._records = [...(options?.records ?? [])];
  }

  revisionToIndex(revision: number) {
    const result = revision + (this._records.length - this._latestRevision) - 1;
    if (result < 0 || result >= this._records.length) return -1;

    return result;
  }

  indexToRevision(index: number) {
    if (index < 0 || index >= this._records.length) return -1;

    return index + (this._latestRevision - this._records.length) + 1;
  }

  /**
   * Pushes new change to records that applies to specificed revision.
   * If it applies to an older revision then it's modified so it can be composed as last record.
   * @returns Newest pushed record in records.
   */
  push(change: RevisionChangeset): RevisionChangeset {
    if (change.revision > this.latestRevision) {
      throw new Error(
        `Unexpected change ${String(change.changeset)} at revision ${
          change.revision
        } is newer than latestRevision ${this._latestRevision}.`
      );
    }

    const deltaRevision = change.revision - this._latestRevision;
    const firstRecordIndex = this._records.length + deltaRevision;
    if (firstRecordIndex < 0) {
      throw new Error(
        `Missing older records to push change ${String(change.changeset)} at revision ${
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
      revision: this._latestRevision + 1,
    };
    this._records.push(latestRecord);

    this._latestRevision = latestRecord.revision;

    return latestRecord;
  }

  slice(startRevision: number, endRevision: number) {
    const startIndex = this.revisionToIndex(startRevision);
    if (startIndex === -1) return [];
    const endIndex = this.revisionToIndex(endRevision);
    if (endRevision === -1) return [];

    return this.records.slice(startIndex, endIndex);
  }

  /**
   * Deletes all records. Latest revision is unmodified.
   */
  clear() {
    this._records = [];
  }

  /**
   * Composition of all records
   */
  getComposed() {
    return this._records.reduce((a, b) => a.compose(b.changeset), Changeset.EMPTY);
  }
}
