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
  if (input.allUsers) {
    // Sign out all users
    signedOutUserIds = services.auth
      .getAvailableUserIds()
      .map(objectIdToStr)
      .filter(isDefined);

    await services.auth.deleteAllAuth();
  } else if (input.user) {
    // Sign out specified user
    signedOutUserIds = [objectIdToStr(input.user.id)];

    await services.auth.deleteAuthByUserId(input.user.id);
  }

  return {
    signedOutUserIds,
    availableUserIds: services.auth
      .getAvailableUserIds()
      .map(objectIdToStr)
      .filter(isDefined),
  };
};
