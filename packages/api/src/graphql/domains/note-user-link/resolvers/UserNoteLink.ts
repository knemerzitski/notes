import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { findNoteUserMaybe } from '../../../../services/note/note';
import { UserNoteLink_id_fromQueryFn } from '../../../../services/note/user-note-link-id';
import type { NoteCategory, UserNoteLinkResolvers } from '../../types.generated';

export const UserNoteLink: UserNoteLinkResolvers = {
  id: async (parent, _arg, _ctx) => {
    return UserNoteLink_id_fromQueryFn(parent.query, parent.userId);
  },
  categoryName: async (parent, _arg, _ctx) => {
    return findNoteUserMaybe(
      parent.userId,
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
      parent.userId,
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
      query: createMapQueryFn(parent.query)<
        typeof QueryableNoteUser.schema.preferences
      >()(
        (query) => ({
          users: {
            _id: 1,
            preferences: query,
          },
        }),
        (note) => findNoteUserMaybe(parent.userId, note)?.preferences
      ),
    };
  },
  public: (parent, _arg, _ctx) => {
    return {
      noteId: async () =>
        (
          await parent.query({
            _id: 1,
          })
        )?._id,
      query: createMapQueryFn(parent.query)<typeof QueryableNoteUser>()(
        (query) => ({
          users: {
            _id: 1,
            ...query,
          },
        }),
        (note) => findNoteUserMaybe(parent.userId, note)
      ),
    };
  },
};
