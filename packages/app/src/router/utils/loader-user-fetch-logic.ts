import { RouterContext } from '../../router';
import { getCurrentUserId } from '../../user/models/signed-in-user/get-current';

import { routeFetchPolicy } from './route-fetch-policy';

export function loaderUserFetchLogic(ctx: {
  context: RouterContext;
  route: {
    id: string;
  };
  deps: Record<string, unknown>;
}) {
  const {
    context: { apolloClient, fetchedRoutes },
  } = ctx;

  const userId = getCurrentUserId(apolloClient.cache);
  const routeId = `${ctx.route.id}-${JSON.stringify(ctx.deps)}`;

  return {
    fetchPolicy: routeFetchPolicy(userId, routeId, {
      apolloClient,
      fetchedRoutes,
    }),
    userId,
    /**
     * Set current route as successfully fetched
     */
    setIsSucessfullyFetched: () => {
      fetchedRoutes.add(userId, routeId);
    },
  };
}
