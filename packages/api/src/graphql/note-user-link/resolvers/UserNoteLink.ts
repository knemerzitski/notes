import { findNoteUser, UserNoteLink_id } from '../../../services/note/note';
import type { NoteCategory, UserNoteLinkResolvers } from './../../types.generated';

export const UserNoteLink: UserNoteLinkResolvers = {
  id: async (parent, _arg, _ctx) => {
    const noteId = (
      await parent.query({
        _id: 1,
      })
    )?._id;
    if (!noteId) {
      return;
    }

    return UserNoteLink_id(noteId, parent.userId);
  },
  categoryName: async (parent, _arg, _ctx) => {
    return findNoteUser(
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
    return findNoteUser(
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
      query: async (query) => {
        return findNoteUser(
          parent.userId,
          await parent.query({
            users: {
              _id: 1,
              preferences: query,
            },
          })
        )?.preferences;
      },
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
      query: async (query) => {
        const note = await parent.query({
          users: {
            ...query,
            _id: 1,
          },
        });

        return findNoteUser(parent.userId, note);
      },
    };
  },
};
