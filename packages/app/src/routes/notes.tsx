import { createFileRoute, defer } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { NotesMain } from '../note/components/NotesMain';
import { getCurrentUserId } from '../user/models/signed-in-user/get-current';
import { routeFetchPolicy } from '../utils/route-fetch-policy';

const RouteNotes_Query = gql(`
  query RouteNotes_Query($userBy: UserByInput!, $default_first: NonNegativeInt, $default_after: ObjectID) {
    signedInUser(by: $userBy) {
      ...NoteMain_UserFragment
    }
  }
`);

export const Route = createFileRoute('/_root_layout/notes')({
  component: Notes,
  pendingComponent: Notes,
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
            query: RouteNotes_Query,
            variables: {
              userBy: {
                id: userId,
              },
              default_first: 20,
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

function Notes() {
  return <NotesMain />;
}
