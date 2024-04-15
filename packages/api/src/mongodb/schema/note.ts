import { ObjectId, WithId } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../collections';

export interface NoteSchema extends WithId<Document> {
  publicId: string;
  ownerId: ObjectId;
  // TODO rename to collabTextIds, as clearer that it can have multiple values
  collabTextId: Record<string, ObjectId>;
}

export const noteDefaultValues = {
  publicId: () => nanoid(),
};

export const noteDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { publicId: 1 },
      unique: true,
    },
  ],
};

// TODO fix, put in another file
// export function createDocumentServer(Note: MongooseModels['Note']) {
//   return new MultiFieldDocumentServer<'title' | 'content'>(Note.collection);
// }
