import { createFileRoute } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { getDefaultPerPageCount } from '../device-preferences/utils/per-page-count';
import { TrashMain } from '../note/components/TrashMain';
import { useIsLoaderDataFulfilled } from '../router/hooks/useIsLoaderDataFulfilled';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';
import { IsLoadingProvider } from '../utils/context/is-loading';

const RouteTrash_Query = gql(`
  query RouteTrash_Query($userBy: UserByInput!, $trash_first: NonNegativeInt, $trash_after: ObjectID) {
    signedInUser(by: $userBy){
      ...TrashMain_UserFragment
    }
  }
`);

export const Route = createFileRoute('/_root_layout/trash')({
  component: Trash,
  loader(ctx) {
    const {
      context: { apolloClient },
    } = ctx;

    const { fetchPolicy, userId, setIsSucessfullyFetched } = loaderUserFetchLogic(ctx);
    if (!fetchPolicy) {
      return {
        query: Promise.resolve(),
      };
    }

    return {
      query: apolloClient
        .query({
          query: RouteTrash_Query,
          variables: {
            userBy: {
              id: userId,
            },
            trash_first: getDefaultPerPageCount(apolloClient.cache),
          },
          fetchPolicy,
        })
        .then(setIsSucessfullyFetched),
    };
  },
});

function Trash() {
  const isRouteLoaded = useIsLoaderDataFulfilled(Route, 'query');

  return (
    <IsLoadingProvider isLoading={!isRouteLoaded}>
      <TrashMain />
    </IsLoadingProvider>
  );
}
