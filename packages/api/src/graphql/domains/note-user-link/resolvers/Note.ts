import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { withPreExecuteList } from '../../../utils/pre-execute';
import type { NoteResolvers } from '../../types.generated';

export const Note: Pick<NoteResolvers, 'users'> = {
  users: async (parent, _arg, ctx, info) => {
    return withPreExecuteList(
      (index, updateSize) => {
        return {
          userId: async () =>
            (
              await parent.query({
                users: {
                  _id: 1,
                },
              })
            )?.users[index]?._id,
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
            (note) => {
              updateSize?.(note.users.length);
              return note.users[index];
            }
          ),
        };
      },
      ctx,
      info
    );
  },
};
