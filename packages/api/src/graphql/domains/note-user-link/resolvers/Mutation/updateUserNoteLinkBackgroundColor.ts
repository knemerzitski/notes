import {
  primeNewBackgroundColor,
  updateNoteBackgroundColorWithLoader,
} from '../../../../../services/note/with-loader';
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

  const { type: bgResultType, note } = await updateNoteBackgroundColorWithLoader({
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
    primeNewBackgroundColor({
      noteId: input.noteId,
      noteUsers: note.users,
      userId: currentUserId,
      newBackgroundColor: input.backgroundColor,
      loader: mongoDB.loaders.note,
    });

    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};
