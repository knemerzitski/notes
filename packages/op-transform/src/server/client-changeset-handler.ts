import { Changeset } from '../changeset/changeset';

interface Record {
  revision: number;
  changeset: Changeset;
}

export abstract class ClientChangesetHandler {
  private changeset: Changeset;

  constructor(changeset: Changeset) {
    this.changeset = changeset;
  }

  /**
   * Current headText value. Used for calculating headText after the change.
   */
  abstract readonly headText: Changeset;

  /**
   * Records required to compute newest record from client changes.
   */
  abstract readonly relevantRecords: Record[];

  /**
   * Latest record before client changes.
   */
  abstract readonly latestRecord: Record | undefined;

  /**
   * Latest revision number before client changes.
   */
  abstract readonly latestRevisionNumber: number;

  abstract updateDocument(newRecord: Record, newHeadText: Changeset): Promise<void>;

  abstract sendChangeToOtherClients(
    revision: number,
    changeset: Changeset
  ): Promise<void>;

  abstract sendChangeAcknowledged(revision: number): Promise<void>;

  async handle() {
    // Calculate client change relative to document latest record
    const relevantRecords = this.relevantRecords;
    let nextChangeset = this.changeset;
    for (const record of relevantRecords) {
      nextChangeset = record.changeset.follow(nextChangeset);
    }

    // Create newest record
    const newestRecord: Record = {
      revision: this.latestRevisionNumber + 1,
      changeset: nextChangeset,
    };
    const newHeadText = this.headText.compose(newestRecord.changeset);

    // Wait for document to be updated before sending anything to clients
    await this.updateDocument(newestRecord, newHeadText);

    // Update clients about the latest change
    return Promise.all([
      this.sendChangeToOtherClients(newestRecord.revision, newestRecord.changeset),
      this.sendChangeAcknowledged(newestRecord.revision),
    ]);
  }
}
