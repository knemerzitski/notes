import { createFileRoute, defer } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { TrashMain } from '../note/components/TrashMain';
import { getCurrentUserId } from '../user/models/signed-in-user/get-current';
import { routeFetchPolicy } from '../utils/route-fetch-policy';

const RouteTrash_Query = gql(`
  query RouteTrash_Query($userBy: SignedInUserByInput!, $trash_first: NonNegativeInt, $trash_after: ObjectID) {
    signedInUser(by: $userBy){
      ...TrashMain_SignedInUserFragment
    }
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

    const userId = getCurrentUserId(apolloClient.cache);

    return {
      deferredQuery: defer(
        apolloClient
          .query({
            query: RouteTrash_Query,
            variables: {
              userBy: {
                id: userId,
              },
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
