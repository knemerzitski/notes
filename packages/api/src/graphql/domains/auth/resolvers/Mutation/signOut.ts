import { isDefined } from '~utils/type-guards/is-defined';

import { objectIdToStr } from '../../../../../mongodb/utils/objectid';

import type { MutationResolvers } from './../../../types.generated';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  arg,
  ctx
) => {
  const { services } = ctx;

  const { input } = arg;

  let signedOutUserIds: string[] = [];
  if (input?.allUsers) {
    // Sign out all users
    signedOutUserIds = services.auth
      .getAvailableUserIds()
      .map(objectIdToStr)
      .filter(isDefined);

    await services.auth.deleteAllAuth();
  } else {
    if (input?.userId) {
      // Sign out specified user
      signedOutUserIds = [objectIdToStr(input.userId)];

      await services.auth.deleteAuthByUserId(input.userId);
    } else if (await ctx.services.requestHeaderAuth.isAuthenticated()) {
      // Sign out authenticated user
      const auth = await ctx.services.requestHeaderAuth.getAuth();

      signedOutUserIds = [objectIdToStr(auth.session.userId)];

      await ctx.services.auth.deleteAuthByUserId(auth.session.userId);
    }
  }

  return {
    signedOutUserIds,
    availableUserIds: services.auth
      .getAvailableUserIds()
      .map(objectIdToStr)
      .filter(isDefined),
  };
};
