import { ChangesetError } from '../common/changeset';
import { RecordSubmissionServerError } from './errors';
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
  try {
    $record.assertHead(headRecord);

    $records.assertRecordsToHead(records, headRecord);

    $records.assertIsComposable(records);

    $records.assertSubmittedRevision(submittedRecord, records, headRecord);

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
  } catch (err) {
    if (err instanceof ChangesetError) {
      throw new RecordSubmissionServerError(
        'CHANNGESET_INVALID',
        'Submitted changeset is invalid',
        {
          cause: err,
        }
      );
    }
    throw err;
  }
}
