import { MongoClient, ObjectId } from 'mongodb';
import { Maybe } from '~utils/types';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { createCollabText } from '../../mongodb/models/collab/create-collab-text';
import { DBNoteSchema } from '../../mongodb/schema/note';
import { NoteUserSchema } from '../../mongodb/schema/note-user';
import { insertNote as model_insertNote } from '../../mongodb/models/note/insert-note';

interface InsertNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  userId: ObjectId;
  backgroundColor?: Maybe<string>;
  categoryName: string;
  collabTexts?: Maybe<Record<string, { initialText: string }>>;
}

export async function insertNote({
  mongoDB,
  userId,
  backgroundColor,
  categoryName,
  collabTexts,
}: InsertNoteParams) {
  let preferences: NoteUserSchema['preferences'] | undefined;
  if (backgroundColor) {
    preferences = {
      backgroundColor,
    };
  }
  const noteUser: NoteUserSchema = {
    _id: userId,
    createdAt: new Date(),
    categoryName,
    ...(preferences && { preferences }),
  };

  const note: DBNoteSchema = {
    _id: new ObjectId(),
    users: [noteUser],
    ...(collabTexts && {
      collab: {
        updatedAt: new Date(),
        texts: Object.entries(collabTexts).map(([key, value]) => ({
          k: key,
          v: createCollabText({
            creatorUserId: userId,
            initialText: value.initialText,
          }),
        })),
      },
    }),
  };

  await mongoDB.client.withSession((session) =>
    session.withTransaction((session) =>
      model_insertNote({
        mongoDB: {
          session,
          collections: mongoDB.collections,
        },
        userId,
        note,
        noteUser,
      })
    )
  );

  return note;
}
