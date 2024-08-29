import { updateDisplayName } from '../../../../../services/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import { publishSignedInUserMutation } from '../Subscription/signedInUserEvents';
import type { MutationResolvers, ResolversTypes } from './../../../types.generated';

export const updateSignedInUserDisplayName: NonNullable<
  MutationResolvers['updateSignedInUserDisplayName']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const {
    input: { displayName },
  } = arg;

  const currentUserId = auth.session.userId;

  await updateDisplayName({
    userId: currentUserId,
    displayName,
    collection: mongoDB.collections.users,
    prime: {
      loader: mongoDB.loaders.user,
    },
  });

  // Prepare payload
  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'UpdateSignedInUserDisplayNamePayload',
    displayName,
    signedInUser: {
      query: (query) =>
        mongoDB.loaders.user.load({
          id: {
            userId: currentUserId,
          },
          query,
        }),
    },
  };

  // Publish to subscriptions
  await publishSignedInUserMutation(currentUserId, payload, ctx);

  return payload;
};
