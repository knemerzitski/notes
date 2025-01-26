import { isDefined } from '~utils/type-guards/is-defined';

import { objectIdToStr } from '../../../../../mongodb/utils/objectid';

import type { MutationResolvers } from './../../../types.generated';

export const syncSessionCookies: NonNullable<
  MutationResolvers['syncSessionCookies']
> = async (_parent, arg, ctx) => {
  const { services } = ctx;
  const {
    input: { availableUserIds },
  } = arg;

  const deleteUserIds = services.auth.getAvailableUserIds().filter((userId) => {
    const isValidUserId = availableUserIds.includes(objectIdToStr(userId));
    return !isValidUserId;
  });

  await services.auth.deleteAuthByUserId(deleteUserIds);

  return {
    availableUserIds: services.auth
      .getAvailableUserIds()
      .map(objectIdToStr)
      .filter(isDefined),
  };
};
