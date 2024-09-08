import { updateBackgroundColor } from '../../../../../services/note/update-background-color';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { assertAuthenticated } from '../../../../../services/auth/auth';

export const updateUserNoteLinkBackgroundColor: NonNullable<
  MutationResolvers['updateUserNoteLinkBackgroundColor']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const { type: bgResultType } = await updateBackgroundColor({
    backgroundColor: input.backgroundColor,
    mongoDB,
    noteId: input.noteId,
    userId: currentUserId,
  });

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'UpdateUserNoteLinkBackgroundColorPayload',
    backgroundColor: input.backgroundColor,
    userNoteLink: {
      userId: currentUserId,
      query: mongoDB.loaders.note.createQueryFn({
        userId: currentUserId,
        noteId: input.noteId,
      }),
    },
  };

  if (bgResultType !== 'already_background_color') {
    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};
