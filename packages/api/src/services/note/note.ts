import { ObjectId } from 'mongodb';
import { queryWithCollabTextSchema } from '../collab/collab';
import { Maybe } from '~utils/types';
import { QueryableNote } from '../../mongodb/loaders/note/descriptions/note';
import { QueryableUserLoader } from '../../mongodb/loaders/user/loader';
import { PartialQueryResultDeep, StrictMongoQueryFn } from '../../mongodb/query/query';
import { StructQuery } from '../../mongodb/query/struct-query';
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
    const queryCollabText = query.collabText;
    const { collabText, ...noteNoCollab } = note;
    if (!queryCollabText || !collabText) {
      return noteNoCollab;
    }

    return {
      ...noteNoCollab,
      collabText: await queryWithCollabTextSchema({
        collabText,
        userLoader,
      })(queryCollabText),
    };
  });
}

export function findNoteUser<T extends MongoReadonlyDeep<{ users: { _id: ObjectId }[] }>>(
  findUserId: ObjectId,
  note: T
): T['users'][0] | undefined {
  return note.users.find(({ _id: userId }) => findUserId.equals(userId));
}

export function findNoteUserMaybe<
  T extends Maybe<PartialQueryResultDeep<{ users: { _id: ObjectId }[] }>>,
>(findUserId: ObjectId, note: T): NonNullable<NonNullable<T>['users']>[0] | undefined {
  return note?.users?.find((noteUser) => findUserId.equals(noteUser?._id));
}

// TODO remove?
export function findOldestNoteUser<
  T extends MongoReadonlyDeep<{ users: { createdAt: Date }[] }>,
>(note: T): T['users'][0] | undefined {
  return note.users.reduce((oldest, user) =>
    oldest.createdAt < user.createdAt ? oldest : user
  );
}

// TODO remove?
export function isNoteUserOlder<
  T extends MongoReadonlyDeep<{ _id: ObjectId; createdAt: Date }>,
>(olderNoteUser: T, targetNoteUser: T): boolean {
  if (olderNoteUser._id.equals(targetNoteUser._id)) {
    // Self is always older
    return true;
  }

  return olderNoteUser.createdAt < targetNoteUser.createdAt;
}

// TODO remove?
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