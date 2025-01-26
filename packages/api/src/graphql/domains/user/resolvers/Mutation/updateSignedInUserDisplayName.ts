import { updateDisplayName } from '../../../../../services/user/update-display-name';
import { publishSignedInUserMutation } from '../Subscription/signedInUserEvents';

import type { MutationResolvers, ResolversTypes } from './../../../types.generated';

export const updateSignedInUserDisplayName: NonNullable<
  MutationResolvers['updateSignedInUserDisplayName']
> = async (_parent, arg, ctx) => {
  const { services, mongoDB } = ctx;
  const auth = await services.requestHeaderAuth.getAuth();

  const { input } = arg;

  const currentUserId = auth.session.userId;

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
      auth,
      query: mongoDB.loaders.user.createQueryFn({
        userId: currentUserId,
      }),
    },
  };

  // Publish to subscriptions
  await publishSignedInUserMutation(currentUserId, payload, ctx);

  return payload;
};
