import type { QueryResolvers } from '../../../../graphql/types.generated';
import { parseOnlyValidClientCookiesFromHeaders } from '../../auth-context';
export const sessionCount: NonNullable<QueryResolvers['sessionCount']> = (
  _parent,
  _arg,
  { request }
) => {
  const clientCookies = parseOnlyValidClientCookiesFromHeaders(request.headers);
  if (!clientCookies) return 0;

  return Object.values(clientCookies.sessions).length;
};
