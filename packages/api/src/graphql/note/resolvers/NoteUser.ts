import { QueryDeep } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';
import type { NoteUserResolvers } from './../../types.generated';

export const NoteUser: NoteUserResolvers = {
  readOnly: async (parent) => {
    return (
      await parent.queryUser({
        readOnly: 1,
      })
    )?.readOnly;
  },
  user: (parent) => {
    return {
      query: async (query) => {
        const { _id, ...restQuery } = query;
        const user = await parent.queryUser({
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
  higherScope: async (parent) => {
    const query: QueryDeep<NonNullable<QueryableNote['users']>[0]> = {
      _id: 1,
      createdAt: 1,
    };

    const users = await parent.queryAllUsers(query);
    if (!users) return;

    const user = await parent.queryUser(query);
    if (user?.createdAt == null) return;

    // Self doesn't have higher scope
    if (parent.currentUserId.equals(user._id)) return false;

    const currentUser = users.find(({ _id: userId }) =>
      parent.currentUserId.equals(userId)
    );
    if (currentUser?.createdAt == null) return;

    return user.createdAt < currentUser.createdAt;
  },
};
