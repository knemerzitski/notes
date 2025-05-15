import { HeadRecord, ServerRecord } from '../types';

/**
 * records [Rk , ... , Rn] \
 * headRecord H = ... Rk * ... * Rn
 *
 * Asserts that records are composable, have correct revisions
 * and headRecord revision matches last record.
 */
export function assertRecordsToHead(
  records: readonly ServerRecord[],
  headRecord: HeadRecord
) {
  const lastRecord = records[records.length - 1];
  if (lastRecord) {
    if (lastRecord.revision !== headRecord.revision) {
      throw new Error(
        `Unexpected headRecord and last record revision is not equal. records[-1].revision: ${lastRecord.revision}, headRecord.revision: ${headRecord.revision}`
      );
    }
    if (lastRecord.changeset.outputLength !== headRecord.text.outputLength) {
      throw new Error(
        `Unexpected headRecord and last record outputLengths are different. records[-1].outputLength: ${lastRecord.changeset.outputLength}, headRecord.outputLength: ${headRecord.text.outputLength}`
      );
    }
  }
}
