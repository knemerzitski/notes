import { createFileRoute } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { ArchiveMain } from '../note/components/ArchiveMain';
import { IsLoadingProvider } from '../utils/context/is-loading';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';

const RouteArchive_Query = gql(`
  query RouteArchive_Query($userBy: UserByInput!, $archive_first: NonNegativeInt, $archive_after: ObjectID) {
    signedInUser(by: $userBy) {
      ...ArchiveMain_UserFragment
    }
  }
`);

export const Route = createFileRoute('/_root_layout/archive')({
  component: Archive,
  pendingComponent: ArchivePending,
  async loader(ctx) {
    const {
      context: { apolloClient },
    } = ctx;

    const { fetchPolicy, userId, setIsSucessfullyFetched } = loaderUserFetchLogic(ctx);
    if (!fetchPolicy) {
      return;
    }

    await apolloClient
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
      .then(setIsSucessfullyFetched);
  },
});

function Archive() {
  return <ArchiveMain />;
}

function ArchivePending() {
  return (
    <IsLoadingProvider isLoading={true}>
      <ArchiveMain />
    </IsLoadingProvider>
  );
}
