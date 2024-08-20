import {
  primeDisplayName,
  updateDisplayName,
} from '../../../../services/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import { publishSignedInUserMutation } from '../Subscription/signedInUserEvents';
import type { MutationResolvers, ResolversTypes } from './../../../types.generated';

export const updateSignedInUserDisplayName: NonNullable<
  MutationResolvers['updateSignedInUserDisplayName']
> = async (_parent, arg, ctx) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const {
    input: { displayName },
  } = arg;

  const currentUserId = auth.session.user._id;

  await updateDisplayName({
    userId: currentUserId,
    displayName,
    collection: mongodb.collections.users,
  });

  primeDisplayName({
    userId: currentUserId,
    displayName,
    loader: mongodb.loaders.user,
  });

  // Prepare payload
  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'UpdateSignedInUserDisplayNamePayload',
    displayName,
    signedInUser: {
      query: (query) =>
        mongodb.loaders.user.load({
          id: {
            userId: currentUserId,
          },
          query,
        }),
    },
  };

  // Publish to subscriptions
  await publishSignedInUserMutation(currentUserId, payload, ctx);

  // Return response
  return payload;
};
