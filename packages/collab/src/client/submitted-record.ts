import { Changeset } from '../changeset';
import { SubmittedRevisionRecord } from '../records/record';

import { CollabClientEvents as CollabClientEvents } from './collab-client';
import { SelectionRange } from './selection-range';

export class SubmittedRecord implements SubmittedRevisionRecord {
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

    this.beforeSelection = SelectionRange.closestRetainedPosition(
      this.beforeSelection,
      externalChange
    );
    this.afterSelection = SelectionRange.closestRetainedPosition(
      this.afterSelection,
      before.submitted.follow(externalChange)
    );
  }
}
