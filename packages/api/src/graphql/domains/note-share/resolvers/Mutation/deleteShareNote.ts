import { deleteShareLinks } from '../../../../../services/note/delete-share-links';
import { getNoteUsersIds } from '../../../../../services/note/note';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const deleteShareNote: NonNullable<MutationResolvers['deleteShareNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { services, mongoDB } = ctx;
  const { input } = arg;

  const auth = await services.auth.getAuth(input.authUser.id);
  const noteId = input.note.id;

  const currentUserId = auth.session.userId;

  const deleteResult = await deleteShareLinks({
    mongoDB,
    noteId,
    userId: currentUserId,
  });

  const noteQuery = mongoDB.loaders.note.createQueryFn({
    userId: currentUserId,
    noteId,
  });

  const payload: ResolversTypes['SignedInUserMutation'] = {
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
