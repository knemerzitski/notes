import { ObjectId } from 'mongodb';
import { Maybe } from '~utils/types';
import { PartialQueryResultDeep } from '../../mongodb/query/query';
import { DBNoteSchema } from '../../mongodb/schema/note';
import { MongoReadonlyDeep } from '../../mongodb/types';

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
