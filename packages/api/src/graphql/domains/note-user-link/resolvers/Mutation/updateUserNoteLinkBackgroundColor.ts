import { updateBackgroundColor } from '../../../../../services/note/update-background-color';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const updateUserNoteLinkBackgroundColor: NonNullable<
  MutationResolvers['updateUserNoteLinkBackgroundColor']
> = async (_parent, arg, ctx) => {
  const { services, mongoDB } = ctx;
  const { input } = arg;

  const noteId = input.note.id;
  const auth = await services.auth.getAuth(input.authUser.id);

  const currentUserId = auth.session.userId;

  const { type: bgResultType } = await updateBackgroundColor({
    backgroundColor: input.backgroundColor,
    mongoDB,
    noteId,
    userId: currentUserId,
  });

  const payload: ResolversTypes['SignedInUserMutation'] = {
    __typename: 'UpdateUserNoteLinkBackgroundColorPayload',
    backgroundColor: input.backgroundColor,
    userNoteLink: {
      userId: currentUserId,
      query: mongoDB.loaders.note.createQueryFn({
        userId: currentUserId,
        noteId,
      }),
    },
  };

  if (bgResultType !== 'already_background_color') {
    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};
