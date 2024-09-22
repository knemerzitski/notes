import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { insertUserByShareLink } from '../../../../../services/note/insert-user-by-share-link';
import {
  NoteCategory,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const createNoteLinkByShareAccess: NonNullable<
  MutationResolvers['createNoteLinkByShareAccess']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const insertResult = await insertUserByShareLink({
    mongoDB,
    userId: currentUserId,
    categoryName: NoteCategory.DEFAULT,
    shareLinkId: input.shareAccessId,
  });

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'CreateNoteLinkByShareAccessPayload',
    userNoteLink: {
      userId: currentUserId,
      query: mongoDB.loaders.noteByShareLink.createQueryFn({
        shareLinkId: input.shareAccessId,
      }),
    },
  };

  // Publish to subscriptions
  if (insertResult.type !== 'already_user') {
    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};
