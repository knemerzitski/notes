import { createFileRoute } from '@tanstack/react-router';
import { boolean, optional, string, type } from 'superstruct';

import { gql } from '../__generated__';
import { SearchMain } from '../note/components/SearchMain';
import { getCurrentUserId } from '../user/models/signed-in-user/get-current';
import { IsLoadingProvider } from '../utils/context/is-loading';
import { useLogger } from '../utils/context/logger';
import { routeFetchPolicy } from '../utils/route-fetch-policy';
import { useIsLocalOnlyUser } from '../user/hooks/useIsLocalOnlyUser';
import { useIsOnline } from '../utils/hooks/useIsOnline';

const RouteSearch_Query = gql(`
  query RouteSearch_Query($userBy: UserByInput!, $searchText: String!, $first: NonNegativeInt, $after: String) {
    signedInUser(by: $userBy) {
      ...SearchMain_UserFragment
    }
  }
`);

const searchSchema = type({
  // query
  q: optional(string()),
  // local
  l: optional(boolean()),
});

export const Route = createFileRoute('/_root_layout/search')({
  validateSearch: (search) => searchSchema.create(search),
  component: Search,
  pendingComponent: SearchPending,
  pendingMinMs: 500,
  pendingMs: 100,
  loaderDeps: ({ search: { q, l } }) => {
    return {
      q,
      l,
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

    if (ctx.deps.l) {
      // Local no query api
      return;
    }

    const userId = getCurrentUserId(apolloClient.cache);

    if (ctx.deps.q) {
      await apolloClient
        .query({
          query: RouteSearch_Query,
          variables: {
            userBy: {
              id: userId,
            },
            searchText: ctx.deps.q,
            first: 20,
          },
          fetchPolicy,
        })
        .then(() => {
          fetchedRoutes.add(routeId);
        });
    }
  },
});

function Search() {
  const logger = useLogger('route.Search');
  logger?.debug('render');

  const isLocalOnlyUser = useIsLocalOnlyUser();
  const isOnline = useIsOnline();

  const defaultOffline = isLocalOnlyUser || !isOnline;

  const { searchText, offline } = Route.useSearch({
    select(state) {
      return {
        searchText: state.q,
        offline: state.l,
      };
    },
  });

  return <SearchMain searchText={searchText} offline={offline ?? defaultOffline} />;
}

function SearchPending() {
  const logger = useLogger('route.SearchPending');
  logger?.debug('render');

  const searchQuery = Route.useSearch({
    select(state) {
      return state.q;
    },
  });

  return (
    <IsLoadingProvider isLoading={true}>
      <SearchMain searchText={searchQuery} />
    </IsLoadingProvider>
  );
}
