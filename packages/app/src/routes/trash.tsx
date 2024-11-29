import { createFileRoute, defer } from '@tanstack/react-router';
import { TrashMain } from '../note/components/TrashMain';
import { gql } from '../__generated__';
import { routeFetchPolicy } from '../utils/route-fetch-policy';

const RouteTrash_Query = gql(`
  query RouteTrash_Query(
    $trash_first: NonNegativeInt, $trash_after: ObjectID) {
    ...TrashMain_QueryFragment
  }
`);

export const Route = createFileRoute('/_root_layout/trash')({
  component: Trash,
  pendingComponent: Trash,
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
            query: RouteTrash_Query,
            variables: {
              trash_first: 20,
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

function Trash() {
  return <TrashMain />;
}