import { ObjectId } from 'mongodb';
import { queryWithCollabTextSchema } from '../collab/collab';
import { Maybe } from '~utils/types';
import { isDefined } from '~utils/type-guards/is-defined';
import { QueryableNote, QueryableNoteCollab } from '../../mongodb/descriptions/note';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';
import { PartialQueryResultDeep, StrictMongoQueryFn } from '../../mongodb/query/query';
import { CollabSchema } from '../../mongodb/schema/collab';
import { StructQuery } from '../../mongodb/query/struct-query';
import { InferRaw } from 'superstruct';
import { DBNoteSchema } from '../../mongodb/schema/note';
import { MongoReadonlyDeep } from '../../mongodb/types';

interface QueryWithNoteSchemaParams {
  note: DBNoteSchema;
  userLoader: QueryableUserLoader;
}

export function queryWithNoteSchema({
  note,
  userLoader,
}: QueryWithNoteSchemaParams): StrictMongoQueryFn<typeof QueryableNote> {
  return StructQuery.get(QueryableNote).createStrictQueryFnFromRaw(async (query) => {
  const queryCollab = query.collab;
  const { collab, ...noteNoCollab } = note;
  if (!queryCollab || !collab) {
    return noteNoCollab;
  }

  return {
    ...noteNoCollab,
    collab: await queryWithNoteCollabSchema({
      collab,
      userLoader,
      })(queryCollab),
  };
  });
}

interface QueryWithNoteCollabSchemaParams {
  collab: InferRaw<typeof CollabSchema>;
  userLoader: QueryableUserLoader;
}

export function queryWithNoteCollabSchema({
  collab,
  userLoader,
}: QueryWithNoteCollabSchemaParams): StrictMongoQueryFn<typeof QueryableNoteCollab> {
  return StructQuery.get(QueryableNoteCollab).createStrictQueryFnFromRaw(
    async (query) => {
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
                collabText: v,
                userLoader,
                  })(queryText),
            ];
          })
        )
      ).filter(isDefined)
    ),
  };
    }
  );
}

export function findNoteUser<T extends MongoReadonlyDeep<{ users: { _id: ObjectId }[] }>>(
  findUserId: ObjectId,
  note: T
): T['users'][0] | undefined {
  return note.users.find(({ _id: userId }) => findUserId.equals(userId));
}

export function findOldestNoteUser<
  T extends MongoReadonlyDeep<{ users: { createdAt: Date }[] }>,
>(note: T): T['users'][0] | undefined {
  return note.users.reduce((oldest, user) =>
    oldest.createdAt < user.createdAt ? oldest : user
  );
}
export function isNoteUserOlder<
  T extends MongoReadonlyDeep<{ _id: ObjectId; createdAt: Date }>,
>(olderNoteUser: T, targetNoteUser: T): boolean {
  if (olderNoteUser._id.equals(targetNoteUser._id)) {
    // Self is always older
    return true;
  }

  return olderNoteUser.createdAt < targetNoteUser.createdAt;
}

export function isNoteUserOldest<
  T extends MongoReadonlyDeep<{ users: { _id: ObjectId; createdAt: Date }[] }>,
>(noteUser: T['users'][0], note: T) {
  const oldestNoteUser = findOldestNoteUser(note);
  if (!oldestNoteUser) return false;
  return oldestNoteUser._id.equals(noteUser._id);
}

export function noteOwnersCount<
  T extends MongoReadonlyDeep<{ users: { isOwner?: boolean }[] }>,
>(note: T) {
  return note.users.reduce((count, noteUser) => count + (noteUser.isOwner ? 1 : 0), 0);
}

export function getNoteUsersIds<
  T extends MongoReadonlyDeep<{ users: readonly { _id: ObjectId }[] }>,
>(note: T): ObjectId[] {
  return note.users.map((noteUser) => noteUser._id);
}

export function findNoteUserInSchema(userId: ObjectId, note: Maybe<DBNoteSchema>) {
  return note?.users.find((noteUser) => noteUser._id.equals(userId));
}

export function findNoteTextFieldInSchema(note: Maybe<NoteSchema>, fieldName: string) {
  if (!note) return;

  const collabTexts = note.collab?.texts
    .filter((text) => text.k === fieldName)
    .map((collabText) => collabText.v);
  return collabTexts?.[0];
}