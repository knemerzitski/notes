export type {
  ServerRecord,
  HeadRecord,
  TailRecord,
  SubmittedRecord,
  ServerState,
} from './types';

export { initialState } from './initial-state';
export { composeNewTail } from './compose-new-tail';
export { processSubmittedRecord } from './process-submitted-record';
