import { createFileRoute, defer } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { ArchiveMain } from '../note/components/ArchiveMain';
import { routeFetchPolicy } from '../utils/route-fetch-policy';
import { getCurrentUserId } from '../user/models/signed-in-user/get-current';

const RouteArchive_Query = gql(`
  query RouteArchive_Query($userBy: SignedInUserByInput!, $archive_first: NonNegativeInt, $archive_after: ObjectID) {
    signedInUser(by: $userBy){
      ...ArchiveMain_SignedInUserFragment
    }
  }
`);

export const Route = createFileRoute('/_root_layout/archive')({
  component: Archive,
  pendingComponent: Archive,
  loader(ctx) {
    const {
      context: { apolloClient, fetchedRoutes },
    } = ctx;

    const routeId = ctx.route.id;
    const fetchPolicy = routeFetchPolicy(routeId, ctx.context);
    if (!fetchPolicy) {
      return;
    }

    const userId = getCurrentUserId(apolloClient.cache);

    return {
      deferredQuery: defer(
        apolloClient
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
            fetchedRoutes.add(routeId);
          })
      ),
    };
  },
});

function Archive() {
  return <ArchiveMain />;
}
