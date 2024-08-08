import { CookiesContext } from '../../../cookies-context';

import type { MutationResolvers } from './../../../types.generated';

export const syncSessionCookies: NonNullable<MutationResolvers['syncSessionCookies']> = (
  _parent,
  { input: { availableUserIds } },
  ctx
) => {
  const { response, cookies } = ctx;

  cookies.filterSessions(availableUserIds);
  const newAvailableUserIds = Object.keys(cookies.sessions);
  if (newAvailableUserIds.length > 0) {
    cookies.setCookieHeadersUpdate(response.multiValueHeaders);
  } else {
    CookiesContext.setCookieHeadersClear(response.multiValueHeaders);
  }

  return {
    availableUserIds: newAvailableUserIds,
  };
};
