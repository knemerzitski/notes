import { unwrapResolver } from '../../../utils/unwrap-resolver';
import type { UserResolvers } from '../../types.generated';

export const User: Pick<UserResolvers, 'note'> = {
  note: async ({ userId }, { by }, { mongoDB }) => {
    const noteId = by.id;

    return {
      query: mongoDB.loaders.note.createQueryFn({
        userId: await unwrapResolver(userId),
        noteId,
      }),
    };
  },
};
