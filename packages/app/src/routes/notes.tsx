import { createFileRoute } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { NotesMain } from '../note/components/NotesMain';
import { IsLoadingProvider } from '../utils/context/is-loading';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';

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
        query: RouteNotes_Query,
        variables: {
          userBy: {
            id: userId,
          },
          default_first: 20,
        },
        fetchPolicy,
      })
      .then(setIsSucessfullyFetched);
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
