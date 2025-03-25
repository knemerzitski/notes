import { createFileRoute } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { ArchiveMain } from '../note/components/ArchiveMain';
import { useIsLoaderDataFulfilled } from '../router/hooks/useIsLoaderDataFulfilled';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';
import { IsLoadingProvider } from '../utils/context/is-loading';

const RouteArchive_Query = gql(`
  query RouteArchive_Query($userBy: UserByInput!, $archive_first: NonNegativeInt, $archive_after: ObjectID) {
    signedInUser(by: $userBy) {
      ...ArchiveMain_UserFragment
    }
  }
`);

export const Route = createFileRoute('/_root_layout/archive')({
  component: Archive,
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
          query: RouteArchive_Query,
          variables: {
            userBy: {
              id: userId,
            },
            archive_first: 20,
          },
          fetchPolicy,
        })
        .then(setIsSucessfullyFetched),
    };
  },
});

function Archive() {
  const isRouteLoaded = useIsLoaderDataFulfilled(Route, 'query');

  return (
    <IsLoadingProvider isLoading={!isRouteLoaded}>
      <ArchiveMain />
    </IsLoadingProvider>
  );
}
