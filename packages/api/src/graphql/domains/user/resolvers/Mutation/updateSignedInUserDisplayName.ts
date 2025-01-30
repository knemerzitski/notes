import { updateDisplayName } from '../../../../../services/user/update-display-name';
import { publishSignedInUserMutation } from '../Subscription/signedInUserEvents';

import type { MutationResolvers, ResolversTypes } from './../../../types.generated';

export const updateSignedInUserDisplayName: NonNullable<
  MutationResolvers['updateSignedInUserDisplayName']
> = async (_parent, arg, ctx) => {
  const { mongoDB } = ctx;
  const { input } = arg;

  const currentUserId = input.authUser.id;

  await updateDisplayName({
    mongoDB,
    userId: currentUserId,
    displayName: input.displayName,
  });

  // Prepare payload
  const payload: ResolversTypes['SignedInUserMutation'] = {
    __typename: 'UpdateSignedInUserDisplayNamePayload',
    displayName: input.displayName,
    signedInUser: {
      userId: currentUserId,
      query: mongoDB.loaders.user.createQueryFn({
        userId: currentUserId,
      }),
    },
  };

  // Publish to subscriptions
  await publishSignedInUserMutation(currentUserId, payload, ctx);

  return payload;
};
