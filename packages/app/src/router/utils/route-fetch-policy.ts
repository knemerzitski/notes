import { ApolloCache, FetchPolicy } from '@apollo/client';

import { User } from '../../__generated__/graphql';
import { isLocalOnlyUser } from '../../user/models/signed-in-user/is-local-only';

import { FetchedRoutes } from '../context/fetched-routes';

export function routeFetchPolicy(
  userId: User['id'],
  routeId: string,
  {
    apolloClient: { cache },
    fetchedRoutes,
  }: {
    apolloClient: { cache: Pick<ApolloCache<unknown>, 'readQuery'> };
    fetchedRoutes: FetchedRoutes;
  }
): FetchPolicy | undefined {
  const isLocalOnly = !userId || isLocalOnlyUser(userId, cache);
  if (isLocalOnly) {
    return;
  }

  const haveFetchedRoute = fetchedRoutes.has(userId, routeId);
  if (haveFetchedRoute) {
    return;
  }

  return 'network-only';
}
