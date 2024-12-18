import { createFileRoute } from '@tanstack/react-router';
import { optional, string, type } from 'superstruct';
import { routeFetchPolicy } from '../utils/route-fetch-policy';
import { gql } from '../__generated__';
import { SearchMain } from '../note/components/SearchMain';
import { IsLoadingProvider } from '../utils/context/is-loading';

const RouteSearch_Query = gql(`
  query RouteSearch_Query($searchText: String!, $first: NonNegativeInt, $after: String) {
    ...SearchMain_QueryFragment
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

    if (ctx.deps.q) {
      await apolloClient
        .query({
          query: RouteSearch_Query,
          variables: {
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
