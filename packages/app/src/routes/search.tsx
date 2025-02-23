import { createFileRoute } from '@tanstack/react-router';
import { boolean, optional, string, type } from 'superstruct';

import { gql } from '../__generated__';
import { SearchMain } from '../note/components/SearchMain';
import { getCurrentUserId } from '../user/models/signed-in-user/get-current';
import { IsLoadingProvider } from '../utils/context/is-loading';
import { useLogger } from '../utils/context/logger';
import { routeFetchPolicy } from '../router/utils/route-fetch-policy';

const RouteSearch_Query = gql(`
  query RouteSearch_Query($userBy: UserByInput!, $searchText: String!, $first: NonNegativeInt, $after: String) {
    signedInUser(by: $userBy) {
      ...SearchMain_UserFragment
    }
  }
`);

const searchSchema = type({
  text: optional(string()),
  offline: optional(boolean()),
});

export const Route = createFileRoute('/_root_layout/search')({
  validateSearch: (search) => searchSchema.create(search),
  component: Search,
  pendingComponent: SearchPending,
  pendingMinMs: 500,
  pendingMs: 100,
  loaderDeps: ({ search: { text, offline } }) => {
    return {
      text,
      offline,
    };
  },
  loader: async (ctx) => {
    const {
      context: { apolloClient, fetchedRoutes },
    } = ctx;

    const routeId = `${ctx.route.id}-${JSON.stringify(ctx.deps)}`;
    const fetchPolicy = routeFetchPolicy(routeId, ctx.context);
    if (!fetchPolicy) {
      return;
    }

    if (!ctx.deps.text || ctx.deps.offline) {
      // Local no query api
      return;
    }

    const userId = getCurrentUserId(apolloClient.cache);

    await apolloClient
      .query({
        query: RouteSearch_Query,
        variables: {
          userBy: {
            id: userId,
          },
          searchText: ctx.deps.text,
          first: 20,
        },
        fetchPolicy,
      })
      .then(() => {
        fetchedRoutes.add(routeId);
      });
  },
});

function Search() {
  const logger = useLogger('route.Search');
  logger?.debug('render');

  return <SearchMain />;
}

function SearchPending() {
  const logger = useLogger('route.SearchPending');
  logger?.debug('render');

  return (
    <IsLoadingProvider isLoading={true}>
      <SearchMain />
    </IsLoadingProvider>
  );
}
