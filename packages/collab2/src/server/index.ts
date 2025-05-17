export type {
  ServerRecord,
  HeadRecord,
  TailRecord,
  SubmittedRecord,
  ServerState,
} from './types';

export { createState } from './create-state';
export { composeNewTail } from './compose-new-tail';
export { processSubmittedRecord } from './process-submitted-record';

export { ServerError, RecordSubmissionServerError } from './errors';
