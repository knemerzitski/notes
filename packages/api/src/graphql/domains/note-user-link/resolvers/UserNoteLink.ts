import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { NoteUserSchema } from '../../../../mongodb/schema/note-user';
import { UserSchema } from '../../../../mongodb/schema/user';
import { findNoteUserMaybe } from '../../../../services/note/note';
import { UserNoteLink_id_fromQueryFn } from '../../../../services/note/user-note-link-id';
import { unwrapResolver } from '../../../utils/unwrap-resolver';
import type { NoteCategory, UserNoteLinkResolvers } from '../../types.generated';
import { UserNoteLinkMapper } from '../schema.mappers';

function createNoteUserQuery(parent: UserNoteLinkMapper) {
  return createMapQueryFn(parent.query)<QueryableNoteUser>()(
    (query) => ({
      users: {
        ...query,
        _id: 1,
      },
    }),
    async (note) => findNoteUserMaybe(await unwrapResolver(parent.userId), note)
  );
}

export const UserNoteLink: Pick<
  UserNoteLinkResolvers,
  | 'categoryName'
  | 'deletedAt'
  | 'id'
  | 'isOwner'
  | 'note'
  | 'preferences'
  | 'readOnly'
  | 'user'
> = {
  id: async (parent, _arg, _ctx) => {
    return UserNoteLink_id_fromQueryFn(parent.query, await unwrapResolver(parent.userId));
  },
  categoryName: async (parent, _arg, _ctx) => {
    return findNoteUserMaybe(
      await unwrapResolver(parent.userId),
      await parent.query({
        users: {
          _id: 1,
          categoryName: 1,
        },
      })
    )?.categoryName as NoteCategory;
  },
  deletedAt: async (parent, _arg, _ctx) => {
    return findNoteUserMaybe(
      await unwrapResolver(parent.userId),
      await parent.query({
        users: {
          _id: 1,
          trashed: {
            expireAt: 1,
          },
        },
      })
    )?.trashed?.expireAt;
  },
  note: (parent, _arg, _ctx) => {
    return {
      query: parent.query,
    };
  },
  preferences: (parent, _arg, _ctx) => {
    return {
      query: createMapQueryFn(parent.query)<NoteUserSchema['preferences']>()(
        (query) => ({
          users: {
            _id: 1,
            preferences: query,
          },
        }),
        async (note) =>
          findNoteUserMaybe(await unwrapResolver(parent.userId), note)?.preferences
      ),
    };
  },
  isOwner: async (parent, _arg, _ctx) => {
    const queryNoteUser = createNoteUserQuery(parent);

    return (
      (
        await queryNoteUser({
          isOwner: 1,
        })
      )?.isOwner ?? false
    );
  },
  readOnly: async (parent, _arg, _ctx) => {
    const queryNoteUser = createNoteUserQuery(parent);

    return (
      (
        await queryNoteUser({
          readOnly: 1,
        })
      )?.readOnly ?? false
    );
  },
  user: (parent, _arg, _ctx) => {
    const queryNoteUser = createNoteUserQuery(parent);

    return {
      userId: parent.userId,
      query: createMapQueryFn(queryNoteUser)<Pick<UserSchema, '_id' | 'profile'>>()(
        (query) => {
          const { _id, ...restQuery } = query;
          return {
            _id,
            user: restQuery,
          };
        },
        (noteUser) => {
          return {
            _id: noteUser._id,
            ...noteUser.user,
          };
        }
      ),
    };
  },
};
