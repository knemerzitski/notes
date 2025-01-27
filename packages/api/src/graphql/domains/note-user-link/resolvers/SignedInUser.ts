import type { SignedInUserResolvers } from './../../types.generated';

export const SignedInUser: Pick<SignedInUserResolvers, 'noteLink'> = {
  noteLink: ({ auth }, { by }, { mongoDB }) => {
    const userId = auth.session.userId;
    const noteId = by.id;

    return {
      userId,
      query: mongoDB.loaders.note.createQueryFn({
        userId,
        noteId,
      }),
    };
  },
};
