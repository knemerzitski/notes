import { $record } from './record';
import { $records } from './records';
import { HeadRecord, ServerRecord, SubmittedRecord } from './types';

/**
 * Processes insertion of a submitted record
 */
export function processSubmittedRecord(
  submittedRecord: SubmittedRecord,
  records: readonly ServerRecord[],
  headRecord: HeadRecord
) {
  $record.assertHead(headRecord);

  $records.assertRecordsToHead(records, headRecord);

  $records.assertIsComposable(records);

  $records.assertSubmittedRevision(records, submittedRecord);

  const duplicateRecord = $records.findSubmittedDuplicate(records, submittedRecord);
  if (duplicateRecord) {
    return {
      type: 'duplicate' as const,
      record: duplicateRecord,
    };
  }

  const newServerRecord = $records.submittedHeadComposable(
    submittedRecord,
    headRecord,
    records
  );

  return {
    type: 'new' as const,
    record: newServerRecord,
    headRecord: $record.composeHeadRecord(newServerRecord, headRecord),
  };
}
