import { MongoClient, ObjectId } from 'mongodb';
import { NoteSchema } from '../../mongodb/schema/note';
import { NoteUserSchema } from '../../mongodb/schema/note-user';
import { getNotesArrayPath } from '../../mongodb/schema/user';
import { createCollabText } from '../collab/collab';
import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { Maybe } from '~utils/types';

interface InsertNewNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  userId: ObjectId;
  backgroundColor?: Maybe<string>;
  categoryName: string;
  collabTexts?: Maybe<Record<string, { initialText: string }>>;
}

export async function insertNewNote({
  mongoDB,
  userId,
  backgroundColor,
  categoryName,
  collabTexts,
}: InsertNewNoteParams) {
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

  const note: NoteSchema = {
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
    session.withTransaction(async (session) => {
      // First request must not be done in parallel or you get NoSuchTransaction error
      await mongoDB.collections.notes.insertOne(note, { session });

      // Now can do requests in parellel
      await mongoDB.collections.users.updateOne(
        {
          _id: userId,
        },
        {
          $push: {
            [getNotesArrayPath(noteUser.categoryName)]: note._id,
          },
        },
        { session }
      );
    })
  );

  return note;
}
