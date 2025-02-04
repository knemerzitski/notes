import { QueryableNote } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { withPreExecuteList } from '../../../utils/pre-execute';
import type { NoteResolvers } from '../../types.generated';

export const Note: Pick<NoteResolvers, 'users'> = {
  users: async (parent, _arg, ctx, info) => {
    return withPreExecuteList(
      (index, updateSize) => {
        return {
          userId: async () => {
            const note = await parent.query({
              users: {
                _id: 1,
              },
            });

            if (note) {
              updateSize?.(note.users.length);
            }

            return note?.users[index]?._id;
          },
          query: createMapQueryFn(parent.query)<QueryableNote>()(
            (query) => ({
              ...query,
              users: {
                ...query.users,
                _id: 1,
              },
            }),
            (note) => {
              updateSize?.(note.users.length);
              return note;
            }
          ),
        };
      },
      ctx,
      info
    );
  },
};
