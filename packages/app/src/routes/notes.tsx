import { createFileRoute } from '@tanstack/react-router';

import { gql } from '../__generated__';
import { NotesMain } from '../note/components/NotesMain';
import { useIsLoaderDataFulfilled } from '../router/hooks/useIsLoaderDataFulfilled';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';
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
  loader(ctx) {
    const {
      context: { apolloClient },
    } = ctx;

    const { fetchPolicy, userId, setIsSucessfullyFetched } = loaderUserFetchLogic(ctx);
    if (!fetchPolicy) {
      return {
        query: Promise.resolve(),
      };
    }

    return {
      query: apolloClient
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
        .then(setIsSucessfullyFetched),
    };
  },
});

function Notes() {
  const isRouteLoaded = useIsLoaderDataFulfilled(Route, 'query');

  return (
    <IsLoadingProvider isLoading={!isRouteLoaded}>
      <NotesMain />
    </IsLoadingProvider>
  );
}
