import { objectIdToStr } from '../../../../../mongodb/utils/objectid';

import type { MutationResolvers } from './../../../types.generated';

export const syncSessionCookies: NonNullable<
  MutationResolvers['syncSessionCookies']
> = async (_parent, arg, ctx) => {
  const { services, mongoDB } = ctx;
  const {
    input: { availableUserIds },
  } = arg;

  const availabeUserIdsSet = new Set(availableUserIds.map(objectIdToStr));

  const deleteUserIds = services.auth.getAvailableUserIds().filter((userId) => {
    const isValidUserId = availabeUserIdsSet.has(objectIdToStr(userId));
    return !isValidUserId;
  });

  await services.auth.removeUser(deleteUserIds);

  return {
    availableUsers: services.auth.getAvailableUserIds().map((userId) => ({
      userId,
      query: mongoDB.loaders.user.createQueryFn({
        userId,
      }),
    })),
  };
};
