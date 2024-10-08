import { createRouter } from '@tanstack/react-router';
import { routeTree } from './__generated__/routeTree.gen';
import { createRouteMasks } from './route-masks';
import { ApolloClient } from '@apollo/client';

export interface RouterContext {
  apolloClient: ApolloClient<object>;
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
  // This enabled injecting dependencies from a React hook or context.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: undefined as any,
});

export function createRouterContext({
  apolloClient,
}: {
  apolloClient: ApolloClient<object>;
}): RouterContext {
  return {
    apolloClient,
  };
}
