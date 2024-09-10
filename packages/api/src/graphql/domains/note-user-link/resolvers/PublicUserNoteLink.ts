import { maybeCallFn } from '~utils/maybe-call-fn';
import type { PublicUserNoteLinkResolvers } from '../../types.generated';
import { UserNoteLink_id } from '../../../../services/note/user-note-link-id';
import { PublicUserMapper } from '../../user/schema.mappers';
import { createMapQueryFn, MongoQueryFnStruct } from '../../../../mongodb/query/query';

export const PublicUserNoteLink: Pick<
  PublicUserNoteLinkResolvers,
  'id' | 'isOwner' | 'readOnly' | 'user'
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
  isOwner: async (parent, _arg, _ctx) => {
    return (
      (
        await parent.query({
          isOwner: 1,
        })
      )?.isOwner ?? false
    );
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
      query: createMapQueryFn(parent.query)<
        MongoQueryFnStruct<PublicUserMapper['query']>
      >()(
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
