import { date, Infer, InferRaw, object } from 'superstruct';

import { RevisionChangesetSchema } from './changeset';

export const CollabTextSchema = object({
  // TODO rename to headRecord
  headText: RevisionChangesetSchema,
  // TODO rename to tailRecord
  tailText: RevisionChangesetSchema,
  /**
   * One to many relationship to CollabRecord document
   * Records can be queried in range (tailText.revision, headText.revision]
   */
  // records: array(instance(ObjectId)),
  /**
   * Time when text was last updated
   */
  updatedAt: date(),
});

export type DBCollabTextSchema = InferRaw<typeof CollabTextSchema>;

export type CollabTextSchema = Infer<typeof CollabTextSchema>;
