import { SubmittedRecord } from '~collab/client/submitted-record';
import { CollabTextRecord, CollabTextRecordInput } from '../../__generated__/graphql';
import { CollabServiceRecord } from '~collab/client/collab-service';

export function submittedRecordToCollabTextRecordInput(
  record: SubmittedRecord
): CollabTextRecordInput {
  return {
    generatedId: record.userGeneratedId,
    change: {
      revision: record.revision,
      changeset: record.changeset,
    },
    afterSelection: record.afterSelection,
    beforeSelection: record.beforeSelection,
  };
}

export function collabTextRecordToCollabServiceRecord(
  record: Pick<CollabTextRecord, 'change' | 'afterSelection' | 'beforeSelection'> & {
    creatorUser: Pick<CollabTextRecord['creatorUser'], 'id'>;
  }
): CollabServiceRecord {
  return {
    creatorUserId: record.creatorUser.id,
    revision: record.change.revision,
    changeset: record.change.changeset,
    afterSelection: {
      start: record.afterSelection.start,
      end: record.afterSelection.end ?? record.afterSelection.start,
    },
    beforeSelection: {
      start: record.beforeSelection.start,
      end: record.beforeSelection.end ?? record.beforeSelection.start,
    },
  };
}
