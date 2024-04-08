import { HydratedDocument, Model, Require_id, Schema } from 'mongoose';

import { CollaborativeDocument } from '~collab/adapters/mongodb/collaborative-document';

import { revisionRecordSchema } from './embedded/revision-record';
import { revisionChangesetSchema } from './embedded/revision-changeset';

// TODO unknown as default makes more sense
export type DBCollabText<T = unknown> = Require_id<CollaborativeDocument<T>>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DBCollabTextMethods {}

export type CollabTextModel = Model<
  DBCollabText,
  object,
  DBCollabTextMethods
>;
export type CollabTextDocument = HydratedDocument<DBCollabText>;

export const collabTextSchema = new Schema<DBCollabText>({
  headDocument: revisionChangesetSchema,
  tailDocument: revisionChangesetSchema,
  records: [revisionRecordSchema],
});
