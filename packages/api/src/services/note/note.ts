import { MongoClient, ObjectId } from 'mongodb';
import { NoteCollabSchema, NoteSchema } from '../../mongodb/schema/note';
import { NoteUserSchema } from '../../mongodb/schema/note-user';
import { getNotesArrayPath } from '../../mongodb/schema/user';
import { createCollabText, queryWithCollabTextSchema } from '../collab/collab';
import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { Maybe } from '~utils/types';
import { isDefined } from '~utils/type-guards/is-defined';
import { QueryableNote, QueryableNoteCollab } from '../../mongodb/descriptions/note';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';
import { ObjectQueryDeep, QueryResultDeep } from '../../mongodb/query/query';

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
  collab: NoteCollabSchema;
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
