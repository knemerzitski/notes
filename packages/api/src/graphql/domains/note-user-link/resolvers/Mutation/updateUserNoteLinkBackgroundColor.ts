import { updateNoteBackgroundColorWithLoader } from '../../../../../services/note/with-loader';
import { assertAuthenticated } from '../../../base/directives/auth';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';

export const updateUserNoteLinkBackgroundColor: NonNullable<
  MutationResolvers['updateUserNoteLinkBackgroundColor']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const bgResult = await updateNoteBackgroundColorWithLoader({
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
      query: (query) =>
        mongoDB.loaders.note.load({
          id: {
            userId: currentUserId,
            noteId: input.noteId,
          },
          query,
        }),
    },
  };

  if (bgResult !== 'already_background_color') {
    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};
