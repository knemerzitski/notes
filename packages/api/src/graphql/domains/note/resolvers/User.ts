import type { UserResolvers } from '../../types.generated';

export const User: Pick<UserResolvers, 'note'> = {
  note: ({ userId }, { by }, { mongoDB }) => {
    const noteId = by.id;

    return {
      query: mongoDB.loaders.note.createQueryFn({
        userId,
        noteId,
      }),
    };
  },
};
