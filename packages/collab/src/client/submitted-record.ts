import { Changeset } from '../changeset/changeset';
import {
  SerializedSubmittedRevisionRecord,
  SubmittedRevisionRecord,
} from '../records/record';
import { SelectionRange } from './selection-range';
import { CollabClientEvents as CollabClientEvents } from './collab-client';
import { Serializable } from '~utils/serialize';

export class SubmittedRecord
  implements SubmittedRevisionRecord, Serializable<SerializedSubmittedRevisionRecord>
{
  readonly userGeneratedId: string;

  readonly revision: number;

  changeset: Changeset;

  beforeSelection: SelectionRange;

  afterSelection: SelectionRange;

  constructor(value: SubmittedRevisionRecord) {
    this.userGeneratedId = value.userGeneratedId;
    this.revision = value.revision;
    this.changeset = value.changeset;
    this.beforeSelection = value.beforeSelection;
    this.afterSelection = value.afterSelection;
  }

  processExternalChangeEvent({
    externalChange,
    before,
    after,
  }: CollabClientEvents['handledExternalChange']) {
    this.changeset = after.submitted;

    this.beforeSelection = SelectionRange.followChangeset(
      this.beforeSelection,
      externalChange
    );
    this.afterSelection = SelectionRange.followChangeset(
      this.afterSelection,
      before.submitted.follow(externalChange)
    );
  }

  serialize(): SerializedSubmittedRevisionRecord {
    return SubmittedRevisionRecord.serialize(this);
  }

  static parseValue(value: unknown): SubmittedRecord {
    const submittedRecord = SubmittedRevisionRecord.parseValue(value);

    return new SubmittedRecord(submittedRecord);
  }
}
