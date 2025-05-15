import { $record } from '../record';
import { ServerRecord, SubmittedRecord } from '../types';

export function findSubmittedDuplicate(
  records: readonly ServerRecord[],
  submittedRecord: SubmittedRecord
) {
  for (
    let i = $record.composableIndexOf(submittedRecord, records) + 1;
    i < records.length;
    i++
  ) {
    const record = records[i];
    if (!record) {
      continue;
    }

    if ($record.isSubmittedDuplicate(record, submittedRecord)) {
      return record;
    }
  }

  return;
}
