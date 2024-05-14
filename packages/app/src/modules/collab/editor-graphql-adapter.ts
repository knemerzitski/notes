import { SubmittedRecord } from '~collab/client/submitted-record';
import { Changeset } from '~collab/changeset/changeset';
import { EditorRevisionRecord } from '~collab/client/collab-editor';
import { CollabTextRecordInput, CollabTextRecord } from '../../__generated__/graphql';

export function submittedRecordToCollabTextRecordInput(
  record: SubmittedRecord
): CollabTextRecordInput {
  return {
    generatedId: record.userGeneratedId,
    change: {
      revision: record.revision,
      changeset: record.changeset.serialize(),
    },
    afterSelection: record.afterSelection,
    beforeSelection: record.beforeSelection,
  };
}

export function collabTextRecordToEditorRevisionRecord(
  record: CollabTextRecord
): EditorRevisionRecord {
  return {
    creatorUserId: record.creatorUserId,
    revision: record.change.revision,
    changeset: Changeset.parseValue(record.change.changeset),
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
