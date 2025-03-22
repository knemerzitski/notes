import { createFileRoute } from '@tanstack/react-router';
import { boolean, optional, string, type } from 'superstruct';

import { gql } from '../__generated__';
import { SearchMain } from '../note/components/SearchMain';
import { useIsRouteLoaded } from '../router/hooks/useIsRouteLoaded';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';
import { IsLoadingProvider } from '../utils/context/is-loading';

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
  pendingMinMs: 500,
  pendingMs: 100,
  loaderDeps: ({ search: { text, offline } }) => {
    return {
      text,
      offline,
    };
  },
  loader: (ctx) => {
    const {
      context: { apolloClient },
    } = ctx;

    const { fetchPolicy, userId, setIsSucessfullyFetched } = loaderUserFetchLogic(ctx);
    if (!fetchPolicy) {
      return {
        query: Promise.resolve(),
      };
    }

    if (!ctx.deps.text || ctx.deps.offline) {
      // Local no query api
      return {
        query: Promise.resolve(),
      };
    }

    return {
      query: apolloClient
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
        .then(setIsSucessfullyFetched),
    };
  },
});

function Search() {
  const isRouteLoaded = useIsRouteLoaded(Route, 'query');

  return (
    <IsLoadingProvider isLoading={!isRouteLoaded}>
      <SearchMain />
    </IsLoadingProvider>
  );
}
