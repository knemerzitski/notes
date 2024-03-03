import { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { nanoid } from 'nanoid';

import { MultiFieldDocumentServer } from '~collab/adapters/mongodb/multi-field-document-server';

import { MongooseModels } from '../models';

import {
  DBCollaborativeDocument,
  collaborativeDocumentSchema,
} from './collaborative-document/collaborative-document';

export interface DBNote {
  publicId: string;
  ownerId: Types.ObjectId;
  title: DBCollaborativeDocument;
  content: DBCollaborativeDocument;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DBNoteMethods {}

export type NoteModel = Model<DBNote, object, DBNoteMethods>;
export type NoteDocument = HydratedDocument<DBNote>;

export const noteSchema = new Schema<DBNote, NoteModel, DBNoteMethods>({
  publicId: {
    type: Schema.Types.String,
    required: true,
    unique: true,
    default: () => nanoid(),
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  title: {
    type: collaborativeDocumentSchema,
    required: true,
  },
  content: {
    type: collaborativeDocumentSchema,
    required: true,
  },
});

export function createDocumentServer(Note: MongooseModels['Note']) {
  return new MultiFieldDocumentServer<'title' | 'content'>(Note.collection);
}
