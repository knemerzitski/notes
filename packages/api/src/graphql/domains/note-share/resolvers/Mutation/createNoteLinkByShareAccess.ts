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
  const { mongoDB } = ctx;
  const { input } = arg;

  const currentUserId = input.authUser.id;

  const insertResult = await insertUserByShareLink({
    mongoDB,
    userId: currentUserId,
    categoryName: NoteCategory.DEFAULT,
    shareLinkId: input.shareAccessId,
    maxUsersCount: ctx.options.note.maxUsersCount,
  });

  const payload: ResolversTypes['SignedInUserMutation'] = {
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
