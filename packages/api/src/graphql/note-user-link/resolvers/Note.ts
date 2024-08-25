import { withPreExecuteList } from '../../../services/graphql/pre-execute';
import { objectIdToStr } from '../../../services/utils/objectid';
import type { NoteResolvers } from './../../types.generated';

export const Note: Pick<NoteResolvers, 'users'> = {
  users: async (parent, _arg, ctx, info) => {
    return withPreExecuteList(
      (index, updateSize) => {
        return {
          parentId: async () =>
            objectIdToStr(
              (
                await parent.query({
                  _id: 1,
                })
              )?._id
            ),
          query: async (query) => {
            const users = (
              await parent.query({
                users: {
                  ...query,
                  _id: 1,
                },
              })
            )?.users;

            updateSize(users?.length);

            return users?.[index];
          },
        };
      },
      ctx,
      info
    );
  },
};
