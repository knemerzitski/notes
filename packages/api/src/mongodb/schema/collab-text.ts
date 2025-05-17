import { date, Infer, InferRaw, number, object } from 'superstruct';
import { ChangesetSchema } from './changeset';

// TODO rename to TextRecordSchema
export const RevisionChangesetSchema = object({
  // TODO rename to text and use plain string type
  changeset: ChangesetSchema,
  revision: number(),
});

export type DBRevisionChangesetSchema = InferRaw<typeof RevisionChangesetSchema>;

export type RevisionChangesetSchema = Infer<typeof RevisionChangesetSchema>;

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
