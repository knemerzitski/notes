import { createFileRoute } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { ArchiveMain } from '../note/components/ArchiveMain';
import { routeFetchPolicy } from '../router/utils/route-fetch-policy';
import { getCurrentUserId } from '../user/models/signed-in-user/get-current';
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
  pendingComponent: ArchivePending,
  async loader(ctx) {
    const {
      context: { apolloClient, fetchedRoutes },
    } = ctx;

    const routeId = ctx.route.id;
    const fetchPolicy = routeFetchPolicy(routeId, ctx.context);
    if (!fetchPolicy) {
      return;
    }

    const userId = getCurrentUserId(apolloClient.cache);

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
      .then(() => {
        fetchedRoutes.add(userId, routeId);
      });
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
