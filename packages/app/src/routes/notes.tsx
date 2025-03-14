import { createFileRoute } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { NotesMain } from '../note/components/NotesMain';
import { routeFetchPolicy } from '../router/utils/route-fetch-policy';
import { getCurrentUserId } from '../user/models/signed-in-user/get-current';
import { IsLoadingProvider } from '../utils/context/is-loading';

const RouteNotes_Query = gql(`
  query RouteNotes_Query($userBy: UserByInput!, $default_first: NonNegativeInt, $default_after: ObjectID) {
    signedInUser(by: $userBy) {
      ...NoteMain_UserFragment
    }
  }
`);

export const Route = createFileRoute('/_root_layout/notes')({
  component: Notes,
  pendingComponent: NotesPending,
  loaderDeps({ search: { switchUserId } }) {
    return {
      userId: switchUserId,
    };
  },
  async loader(ctx) {
    const {
      context: { apolloClient, fetchedRoutes },
    } = ctx;

    const userId = ctx.deps.userId ?? getCurrentUserId(apolloClient.cache);

    const routeId = ctx.route.id;
    const fetchPolicy = routeFetchPolicy(userId, routeId, ctx.context);
    if (!fetchPolicy) {
      return;
    }

    await apolloClient
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
        fetchedRoutes.add(userId, routeId);
      });
  },
});

function Notes() {
  return <NotesMain />;
}

function NotesPending() {
  return (
    <IsLoadingProvider isLoading={true}>
      <NotesMain />
    </IsLoadingProvider>
  );
}
