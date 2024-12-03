import { createFileRoute, defer } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { ArchiveMain } from '../note/components/ArchiveMain';
import { routeFetchPolicy } from '../utils/route-fetch-policy';

const RouteArchive_Query = gql(`
  query RouteArchive_Query(
    $archive_first: NonNegativeInt, $archive_after: ObjectID) {
    ...ArchiveMain_QueryFragment
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

    return {
      deferredQuery: defer(
        apolloClient
          .query({
            query: RouteArchive_Query,
            variables: {
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
