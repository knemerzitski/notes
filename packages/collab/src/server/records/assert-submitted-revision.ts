import { RecordSubmissionServerError } from '../errors';
import { HeadRecord, ServerRecord, SubmittedRecord } from '../types';

export function assertSubmittedRevision(
  submittedRecord: SubmittedRecord,
  records: readonly ServerRecord[],
  headRecord: HeadRecord
) {
  const firstRevision = records[0]?.revision;
  const headRevision = records[records.length - 1]?.revision ?? headRecord.revision;

  if (
    (firstRevision != null && submittedRecord.targetRevision + 1 < firstRevision) ||
    (firstRevision == null && submittedRecord.targetRevision < headRevision)
  ) {
    throw new RecordSubmissionServerError(
      'REVISION_OLD',
      `Missing older records to insert new record. Oldest revision: ${firstRevision != null ? firstRevision - 1 : 'unknown'}, Submitted targetRevision: ${submittedRecord.targetRevision}`
    );
  }

  if (submittedRecord.targetRevision > headRevision) {
    throw new RecordSubmissionServerError(
      'REVISION_INVALID',
      `Cannot insert record after headRecord. headRecord revision: ${headRevision}, Submitted targetRevision: ${submittedRecord.targetRevision}`
    );
  }
}
