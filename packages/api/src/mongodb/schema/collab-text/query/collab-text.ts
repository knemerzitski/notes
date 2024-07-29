import { DeepAnyDescription } from '../../../query/description';
import { CollabTextSchema } from '../collab-text';

import { recordsResolvers as recordsDescription } from './records';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const collabTextDescription: DeepAnyDescription<CollabTextSchema, any> = {
  records: recordsDescription,
};
