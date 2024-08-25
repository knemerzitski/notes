import { MongoClient, ObjectId } from 'mongodb';
import { NoteSchema } from '../../mongodb/schema/note';
import { NoteUserSchema } from '../../mongodb/schema/note-user';
import { createCollabText, queryWithCollabTextSchema } from '../collab/collab';
import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { Maybe } from '~utils/types';
import { isDefined } from '~utils/type-guards/is-defined';
import { QueryableNote, QueryableNoteCollab } from '../../mongodb/descriptions/note';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';
import { ObjectQueryDeep, QueryResultDeep } from '../../mongodb/query/query';
import { CollabSchema } from '../../mongodb/schema/collab';
import { getNotesArrayPath } from '../user/user';
import { objectIdToStr } from '../utils/objectid';

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

interface DeleteNoteCompletelyParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  noteId: ObjectId;
  allNoteUsers: Pick<NoteUserSchema, '_id' | 'categoryName'>[];
}

export function deleteNoteCompletely({
  mongoDB,
  noteId,
  allNoteUsers,
}: DeleteNoteCompletelyParams) {
  return mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      await mongoDB.collections.notes.deleteOne(
        {
          _id: noteId,
        },
        { session }
      );
      await mongoDB.collections.users.bulkWrite(
        allNoteUsers.map((noteUser) => ({
          updateOne: {
            filter: {
              _id: noteUser._id,
            },
            update: {
              $pull: {
                [getNotesArrayPath(noteUser.categoryName)]: noteId,
              },
            },
          },
        })),
        { session }
      );
    })
  );
}

interface DeleteNoteFromUserParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  noteId: ObjectId;
  noteCategoryName: string;
  userId: ObjectId;
}

export function deleteNoteFromUser({
  mongoDB,
  noteId,
  userId,
  noteCategoryName,
}: DeleteNoteFromUserParams) {
  return mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      await mongoDB.collections.notes.updateOne(
        {
          _id: noteId,
        },
        {
          $pull: {
            users: {
              _id: userId,
            },
          },
        },
        {
          session,
        }
      );
      await mongoDB.collections.users.updateOne(
        {
          _id: userId,
        },
        {
          $pull: {
            [getNotesArrayPath(noteCategoryName)]: noteId,
          },
        },
        { session }
      );
    })
  );
}

interface QueryWithNoteSchemaParams {
  query: ObjectQueryDeep<QueryableNote>;
  note: NoteSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithNoteSchema({
  query,
  note,
  userLoader,
}: QueryWithNoteSchemaParams): Promise<QueryResultDeep<QueryableNote>> {
  const queryCollab = query.collab;
  const { collab, ...noteNoCollab } = note;
  if (!queryCollab || !collab) {
    return noteNoCollab;
  }

  return {
    ...noteNoCollab,
    collab: await queryWithNoteCollabSchema({
      query: queryCollab,
      collab,
      userLoader,
    }),
  };
}

interface QueryWithNoteCollabSchemaParams {
  query: ObjectQueryDeep<QueryableNoteCollab>;
  collab: CollabSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithNoteCollabSchema({
  query,
  collab,
  userLoader,
}: QueryWithNoteCollabSchemaParams): Promise<QueryResultDeep<QueryableNoteCollab>> {
  const queryTexts = query.texts;
  const { texts, ...collabNoTexts } = collab;
  if (!queryTexts) {
    return collabNoTexts;
  }

  return {
    ...collab,
    texts: Object.fromEntries(
      (
        await Promise.all(
          collab.texts.map(async ({ k, v }) => {
            const queryText = queryTexts[k];
            if (!queryText) return;

            return [
              k,
              await queryWithCollabTextSchema({
                query: queryText,
                collabText: v,
                userLoader,
              }),
            ];
          })
        )
      ).filter(isDefined)
    ),
  };
}

export function findNoteUser(
  findUserId: ObjectId,
  note: Maybe<QueryResultDeep<QueryableNote>>
) {
  return note?.users?.find(({ _id: userId }) => findUserId.equals(userId));
}

export function findNoteUserInSchema(userId: ObjectId, note: Maybe<NoteSchema>) {
  return note?.users.find((noteUser) => noteUser._id.equals(userId));
}

export function findOldestNoteUser(note: Maybe<QueryResultDeep<QueryableNote>>) {
  return note?.users?.reduce((oldest, user) => {
    if (!user.createdAt) return oldest;
    if (!oldest.createdAt) return user;
    return oldest.createdAt < user.createdAt ? oldest : user;
  });
}

export function findNoteTextFieldInSchema(note: Maybe<NoteSchema>, fieldName: string) {
  if (!note) return;

  const collabTexts = note.collab?.texts
    .filter((text) => text.k === fieldName)
    .map((collabText) => collabText.v);
  return collabTexts?.[0];
}

export function UserNoteLink_id(noteId: ObjectId, userId: ObjectId) {
  return `${objectIdToStr(noteId)}:${objectIdToStr(userId)}`;
}
