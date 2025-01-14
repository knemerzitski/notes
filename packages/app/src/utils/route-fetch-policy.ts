import { ApolloCache, FetchPolicy } from '@apollo/client';

import { getCurrentUserId } from '../user/models/signed-in-user/get-current';
import { isLocalOnlyUser } from '../user/models/signed-in-user/is-local-only';

import { FetchedRoutes } from './context/fetched-routes';

export function routeFetchPolicy(
  routeId: string,
  {
    apolloClient: { cache },
    fetchedRoutes,
  }: {
    apolloClient: { cache: Pick<ApolloCache<unknown>, 'readQuery'> };
    fetchedRoutes: FetchedRoutes;
  }
): FetchPolicy | undefined {
  const userId = getCurrentUserId(cache);
  const isLocalOnly = !userId || isLocalOnlyUser(userId, cache);
  if (isLocalOnly) {
    return;
  }

  const haveFetchedRoute = fetchedRoutes.has(routeId);
  if (haveFetchedRoute) {
    return;
  }

  return 'network-only';
}
