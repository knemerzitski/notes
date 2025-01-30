import type { SignedInUserResolvers } from './../../types.generated';

export const SignedInUser: Pick<SignedInUserResolvers, 'note'> = {
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
