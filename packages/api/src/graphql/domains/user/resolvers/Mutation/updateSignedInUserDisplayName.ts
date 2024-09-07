import { assertAuthenticated } from '../../../../../services/auth/auth';
import { updateDisplayName } from '../../../../../services/user/user';
import { primeNewDisplayName } from '../../../../../services/user/user-loader';
import { publishSignedInUserMutation } from '../Subscription/signedInUserEvents';
import type { MutationResolvers, ResolversTypes } from './../../../types.generated';

export const updateSignedInUserDisplayName: NonNullable<
  MutationResolvers['updateSignedInUserDisplayName']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  await updateDisplayName({
    userId: currentUserId,
    displayName: input.displayName,
    collection: mongoDB.collections.users,
  });
  primeNewDisplayName({
    userId: currentUserId,
    newDisplayName: input.displayName,
    loader: mongoDB.loaders.user,
  });

  // Prepare payload
  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'UpdateSignedInUserDisplayNamePayload',
    displayName: input.displayName,
    signedInUser: {
      query: mongoDB.loaders.user.createQueryFn({
        userId: currentUserId,
      }),
    },
  };

  // Publish to subscriptions
  await publishSignedInUserMutation(currentUserId, payload, ctx);

  return payload;
};
