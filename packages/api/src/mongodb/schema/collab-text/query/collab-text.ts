import { DeepAnyDescription } from '../../../query/description';
import { CollabTextSchema } from '../collab-text';

import { QueryableRecords, recordsResolvers } from './records';

export type QueryableCollabTextSchema = Omit<CollabTextSchema, 'records'> & {
  records: QueryableRecords;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const collabTextDescription: DeepAnyDescription<QueryableCollabTextSchema, any> = {
  records: recordsResolvers,
};
