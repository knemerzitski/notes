import { array, date, Infer, InferRaw, object } from 'superstruct';

import { RevisionChangesetSchema } from './changeset';
import { CollabRecordSchema } from './collab-record';

export const CollabTextSchema = object({
  headText: RevisionChangesetSchema,
  tailText: RevisionChangesetSchema,
  records: array(CollabRecordSchema),
  /**
   * Time when text was last updated
   */
  updatedAt: date(),
});

export type DBCollabTextSchema = InferRaw<typeof CollabTextSchema>;

export type CollabTextSchema = Infer<typeof CollabTextSchema>;
