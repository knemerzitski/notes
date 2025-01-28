import { createFileRoute } from '@tanstack/react-router';
import { optional, string, type } from 'superstruct';

import { gql } from '../__generated__';
import { SearchMain } from '../note/components/SearchMain';
import { IsLoadingProvider } from '../utils/context/is-loading';
import { useIsOnline } from '../utils/hooks/useIsOnline';
import { routeFetchPolicy } from '../utils/route-fetch-policy';
import { getCurrentUserId } from '../user/models/signed-in-user/get-current';

const RouteSearch_Query = gql(`
  query RouteSearch_Query($userBy: SignedInUserByInput!, $searchText: String!, $first: NonNegativeInt, $after: String) {
    signedInUser(by: $userBy) {
      ...SearchMain_SignedInUserFragment
    }
  }
`);

const searchSchema = type({
  q: optional(string()),
});

export const Route = createFileRoute('/_root_layout/search')({
  validateSearch: (search) => searchSchema.create(search),
  component: Search,
  pendingComponent: SearchPending,
  pendingMinMs: 200,
  pendingMs: 100,
  loaderDeps: ({ search: { q } }) => {
    return {
      q,
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

function SearchPending() {
  const isOnline = useIsOnline();

  if (!isOnline) {
    // Fallback to normal/cache search when offline
    return <Search />;
  }

  return (
    <IsLoadingProvider isLoading={true}>
      <SearchMain searchText="" />
    </IsLoadingProvider>
  );
}

function Search() {
  const searchQuery = Route.useSearch({
    select(state) {
      return state.q;
    },
  });

  return <SearchMain searchText={searchQuery} />;
}
