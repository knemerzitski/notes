import { ServerRecord, SubmittedRecord } from '../types';

/**
 * @returns Index of record that {@link submittedRecord} can compose.
 */
export function composableIndexOf(
  submittedRecord: Pick<SubmittedRecord, 'targetRevision'>,
  records: readonly Pick<ServerRecord, 'revision'>[]
) {
  return submittedRecord.targetRevision - (records[0]?.revision ?? -1);
}
