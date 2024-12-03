import { createFileRoute, defer } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { NotesMain } from '../note/components/NotesMain';
import { routeFetchPolicy } from '../utils/route-fetch-policy';

const RouteNotes_Query = gql(`
  query RouteNotes_Query(
    $default_first: NonNegativeInt, $default_after: ObjectID) {
    ...NoteMain_QueryFragment
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

    return {
      deferredQuery: defer(
        apolloClient
          .query({
            query: RouteNotes_Query,
            variables: {
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
