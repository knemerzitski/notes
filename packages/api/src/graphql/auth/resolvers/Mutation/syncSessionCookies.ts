import type { MutationResolvers } from './../../../types.generated';

export const syncSessionCookies: NonNullable<MutationResolvers['syncSessionCookies']> = (
  _parent,
  arg,
  ctx
) => {
  const { response, cookies } = ctx;
  const {
    input: { availableUserIds },
  } = arg;

  cookies.filterSessionsByUserId(availableUserIds);

  cookies.putCookiesToHeaders(response.multiValueHeaders);

  return {
    availableUserIds: cookies.getAvailableSessionUserIds(),
  };
};
