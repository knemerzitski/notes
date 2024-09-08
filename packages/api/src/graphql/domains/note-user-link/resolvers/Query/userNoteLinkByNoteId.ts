import { assertAuthenticated } from '../../../../../services/auth/auth';
import type { QueryResolvers } from '../../../types.generated';

export const userNoteLinkByNoteId: NonNullable<QueryResolvers['userNoteLinkByNoteId']> = (
  _parent,
  arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.userId;

  return {
    userId: currentUserId,
    query: mongoDB.loaders.note.createQueryFn({
      userId: currentUserId,
      noteId: arg.noteId,
    }),
  };
};
