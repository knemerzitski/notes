import type { SignedInUserResolvers } from './../../types.generated';

export const SignedInUser: Pick<SignedInUserResolvers, 'note'> = {
  note: ({ auth }, { by }, { mongoDB }) => {
    const userId = auth.session.userId;
    const noteId = by.id;

    return {
      query: mongoDB.loaders.note.createQueryFn({
        userId,
        noteId,
      }),
    };
  },
};
