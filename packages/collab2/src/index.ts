export { Changeset, ChangesetStruct } from './common/changeset';
export { Selection, SelectionStruct } from './common/selection';

export {
  createState as createServerState,
  composeNewTail,
  processSubmittedRecord,
  ServerError,
  RecordSubmissionServerError,
} from './server';
export type { ServerRecord, SubmittedRecord } from './server';
