import { ServerRecord, SubmittedRecord } from '../types';

export function isSubmittedDuplicate(
  serverRecord: ServerRecord,
  submittedRecord: SubmittedRecord
) {
  if (serverRecord.idempotencyId !== submittedRecord.id) {
    return false;
  }

  if (serverRecord.authorId !== submittedRecord.authorId) {
    return false;
  }

  // Same submitted record insertions are always same even after using follow
  if (
    serverRecord.changeset.joinInsertions() !== submittedRecord.changeset.joinInsertions()
  ) {
    return false;
  }

  return true;
}
