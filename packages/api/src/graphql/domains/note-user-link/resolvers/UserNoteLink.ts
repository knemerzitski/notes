import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { NoteUserSchema } from '../../../../mongodb/schema/note-user';
import { findNoteUserMaybe } from '../../../../services/note/note';
import { UserNoteLink_id_fromQueryFn } from '../../../../services/note/user-note-link-id';
import { unwrapResolver } from '../../../utils/unwrap-resolver';
import type { NoteCategory, UserNoteLinkResolvers } from '../../types.generated';

export const UserNoteLink: UserNoteLinkResolvers = {
  id: async (parent, _arg, _ctx) => {
    return UserNoteLink_id_fromQueryFn(parent.query, await unwrapResolver(parent.userId));
  },
  /*
  TODO merge UserNoteLink with PublicUserNoteLink
    restrict access to private fields with following directive:
      @auth(field: ["userId"]):
    which will do following check
      await services.auth.getAuth(parent.userId)
  */
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
  public: (parent, _arg, _ctx) => {
    return {
      userId: parent.userId,
      noteId: async () =>
        (
          await parent.query({
            _id: 1,
          })
        )?._id,
      query: createMapQueryFn(parent.query)<QueryableNoteUser>()(
        (query) => ({
          users: {
            ...query,
            _id: 1,
          },
        }),
        async (note) => findNoteUserMaybe(await unwrapResolver(parent.userId), note)
      ),
    };
  },
};
