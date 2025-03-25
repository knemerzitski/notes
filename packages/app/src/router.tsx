import { ApolloClient } from '@apollo/client';
import { createRouter } from '@tanstack/react-router';

import { Logger } from '../../utils/src/logging';

import { Maybe } from '../../utils/src/types';

import { routeTree } from './__generated__/routeTree.gen';
import { createRouteMasks } from './route-masks';
import { FetchedRoutes } from './router/context/fetched-routes';

export interface RouterContext {
  apolloClient: ApolloClient<object>;
  fetchedRoutes: FetchedRoutes;
  logger?: Maybe<Logger>;
}

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const router = createRouter({
  routeTree,
  routeMasks: createRouteMasks(routeTree),
  // Context is defined in `AppRouterProvider` component by calling `createRouterContext`
  // This enables injecting dependencies from a React hook or context.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  context: undefined as any,
  defaultPreloadStaleTime: 0,
});

export function createRouterContext(ctx: RouterContext): RouterContext {
  // Middleware when router context is created or changed
  return ctx;
}
