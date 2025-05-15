import { Changeset } from '../changeset';
import { CollabHistoryEvents } from '../history/collab-history';
import { SubmittedRevisionRecord } from '../records/record';

import { SelectionRange } from './selection-range';

// TODO this should be part of history?, extra properties on a history record as between server and submitted record cannot be touched
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
  }: CollabHistoryEvents['handledExternalChange']) {
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
