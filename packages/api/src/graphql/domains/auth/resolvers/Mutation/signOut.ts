import { isDefined } from '../../../../../../../utils/src/type-guards/is-defined';

import { objectIdToStr } from '../../../../../mongodb/utils/objectid';

import type { MutationResolvers } from './../../../types.generated';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  arg,
  ctx
) => {
  const { services, mongoDB } = ctx;

  const { input } = arg;

  let signedOutUserIds: string[] = [];
  if (input.allUsers) {
    // Sign out all users
    signedOutUserIds = services.auth
      .getAvailableUserIds()
      .map(objectIdToStr)
      .filter(isDefined);

    await services.auth.clearAllUsers();
  } else if (input.user) {
    // Sign out specified user
    signedOutUserIds = [objectIdToStr(input.user.id)];

    await services.auth.removeUser(input.user.id);
  }

  return {
    signedOutUserIds,
    availableUsers: services.auth.getAvailableUserIds().map((userId) => ({
      userId,
      query: mongoDB.loaders.user.createQueryFn({
        userId,
      }),
    })),
  };
};
