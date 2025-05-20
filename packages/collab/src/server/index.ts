export type {
  ServerRecord,
  HeadRecord,
  TailRecord,
  SubmittedRecord,
  ServerState,
  TextRecord,
} from './types';

export { createStateFromRecords } from './create-state-from-records';
export { composeNewTail } from './compose-new-tail';
export { processSubmittedRecord } from './process-submitted-record';

export { ServerError, RecordSubmissionServerError } from './errors';
