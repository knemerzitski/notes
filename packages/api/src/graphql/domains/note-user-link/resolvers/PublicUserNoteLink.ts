import { maybeCallFn } from '~utils/maybe-call-fn';
import type { PublicUserNoteLinkResolvers } from '../../types.generated';
import { UserNoteLink_id } from '../../../../services/note/note';

export const PublicUserNoteLink: Pick<
  PublicUserNoteLinkResolvers,
  'createdAt' | 'id' | 'readOnly' | 'user'
> = {
  id: async (parent, _arg, _ctx) => {
    const [userId, noteId] = await Promise.all([
      Promise.resolve(
        parent.query({
          _id: 1,
        })
      ).then((noteUser) => noteUser?._id),
      maybeCallFn(parent.noteId),
    ]);
    if (!userId || !noteId) return;

    return UserNoteLink_id(noteId, userId);
  },
  createdAt: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        createdAt: 1,
      })
    )?.createdAt;
  },
  readOnly: async (parent, _arg, _ctx) => {
    return (
      (
        await parent.query({
          readOnly: 1,
        })
      )?.readOnly ?? false
    );
  },
  user: (parent, _arg, _ctx) => {
    return {
      query: async (query) => {
        const { _id, ...restQuery } = query;
        const user = await parent.query({
          ...(_id != null && { _id }),
          user: restQuery,
        });
        if (!user) return;

        return {
          _id: user._id,
          profile: user.user?.profile,
        };
      },
    };
  },
};
