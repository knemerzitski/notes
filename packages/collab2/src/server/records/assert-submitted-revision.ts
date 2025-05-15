import { ServerRecord, SubmittedRecord } from '../types';

export function assertSubmittedRevision(
  records: readonly ServerRecord[],
  submittedRecord: SubmittedRecord
) {
  const firstRecord = records[0];
  const lastRecord = records[records.length - 1];
  if (!firstRecord || !lastRecord) {
    return;
  }

  if (submittedRecord.targetRevision + 1 < firstRecord.revision) {
    throw new Error(
      `Missing older records to insert new record. Oldest revision: ${firstRecord.revision - 1}, Submitted targetRevision: ${submittedRecord.targetRevision}`
    );
  }

  if (submittedRecord.targetRevision > lastRecord.revision) {
    throw new Error(
      `Cannot insert record after headRecord. headRecord revision: ${lastRecord.revision}, Submitted targetRevision: ${submittedRecord.targetRevision}`
    );
  }
}
