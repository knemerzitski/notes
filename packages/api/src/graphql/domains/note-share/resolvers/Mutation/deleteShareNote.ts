import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { deleteShareLinks } from '../../../../../services/note/delete-share-links';
import { getNoteUsersIds } from '../../../../../services/note/note';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const deleteShareNote: NonNullable<MutationResolvers['deleteShareNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const deleteResult = await deleteShareLinks({
    mongoDB,
    noteId: input.noteId,
    userId: currentUserId,
  });

  const noteQuery = mongoDB.loaders.note.createQueryFn({
    userId: currentUserId,
    noteId: input.noteId,
  });

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'DeleteShareNotePayload',
    shareAccessId: deleteResult.shareLinks?.[0]?._id,
    note: {
      query: noteQuery,
    },
  };

  if (deleteResult.type !== 'already_deleted') {
    const publishUsers = getNoteUsersIds(deleteResult.note);
    await Promise.all(
      publishUsers.map((userId) => publishSignedInUserMutation(userId, payload, ctx))
    );
  }

  return payload;
};
