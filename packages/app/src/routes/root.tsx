import {
  ErrorComponentProps,
  Outlet,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router';

import { ReactNode, useEffect, useState } from 'react';
import { coerce, number, optional, string, type } from 'superstruct';

import { gql } from '../__generated__';
import { AppBarDrawerLayout } from '../layout/components/AppBarDrawerLayout';
import { RedirectLinkSharedNote } from '../note/components/RedirectLinkSharedNote';
import { RedirectNoteNotFound } from '../note/components/RedirectNoteNotFound';
import { RedirectToMobileNote } from '../note/components/RedirectToMobileNote';
import { RouteNoteDialog } from '../note/components/RouteNoteDialog';
import { RouteNoteSharingDialog } from '../note/components/RouteNoteSharingDialog';
import { NoteIdProvider } from '../note/context/note-id';
import { RootRoute } from '../root-route';
import { RouterContext } from '../router';
import { useIsMobile } from '../theme/context/is-mobile';
import { ErrorComponent } from '../utils/components/ErrorComponent';
import { NotFoundTypography } from '../utils/components/NotFoundTypography';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';

const RouteRoot_Query = gql(`
  query RouteRoot_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    noteSharingDialog: signedInUser(by: $userBy) {
      id
      note(by: $noteBy) {
        id
        ...RouteNoteSharingDialog_NoteFragment
      }
    }
  }
`);

const searchSchema = type({
  noteId: optional(coerce(string(), number(), (v) => String(v))),
  sharingNoteId: optional(coerce(string(), number(), (v) => String(v))),
  /**
   * Share id that can be use to access a note.
   */
  share: optional(coerce(string(), number(), (v) => String(v))),
});

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,

  pendingMinMs: 0,
  pendingMs: 0,
  validateSearch: (search) => searchSchema.create(search),
  loaderDeps: ({ search: { noteId, sharingNoteId } }) => {
    return {
      noteId,
      sharingNoteId,
    };
  },
  loader: (ctx) => {
    const {
      context: { apolloClient },
    } = ctx;

    const { fetchPolicy, userId, setIsSucessfullyFetched } = loaderUserFetchLogic(ctx);
    if (!fetchPolicy) {
      return;
    }

    if (ctx.deps.noteId != null) {
      // TODO load anything that's needed when note is open
    }

    const sharingDefer = ctx.deps.sharingNoteId
      ? apolloClient
          .query({
            query: RouteRoot_Query,
            variables: {
              userBy: {
                id: userId,
              },
              noteBy: {
                id: ctx.deps.sharingNoteId,
              },
            },
            fetchPolicy,
          })
          .then(setIsSucessfullyFetched)
      : Promise.resolve();

    return {
      sharingDefer,
    };
  },
});

function Modules({ children }: { children: ReactNode }) {
  return <RootRoute>{children}</RootRoute>;
}

function Root() {
  const { noteId, sharingNoteId, share } = Route.useSearch();

  const router = useRouter();
  const isMobile = useIsMobile();

  // Force render all modals together when changing between mobile and desktop
  // Otherwise modals appear in a unpredictable order
  const [dialogKey, setDialogKey] = useState(() => JSON.stringify({ isMobile }));
  useEffect(() => {
    setDialogKey(JSON.stringify({ isMobile }));
  }, [isMobile]);

  if (noteId && isMobile) {
    // On mobile redirect search ?note=$noteId to note page route
    return (
      <RedirectToMobileNote
        noteId={noteId}
        originalLocation={{
          pathname: router.state.location.pathname,
          search: router.state.location.search,
        }}
      />
    );
  }

  if (share) {
    return <RedirectLinkSharedNote shareId={share} />;
  }

  return (
    <Modules>
      <Outlet />

      {noteId && (
        <NoteIdProvider noteId={noteId}>
          <RedirectNoteNotFound
            navigateOptions={{
              to: '.',
              search: (prev) => ({
                ...prev,
                noteId: undefined,
              }),
            }}
          >
            <RouteNoteDialog key={dialogKey} />
          </RedirectNoteNotFound>
        </NoteIdProvider>
      )}

      {sharingNoteId && <RouteNoteSharingDialog key={dialogKey} noteId={sharingNoteId} />}
    </Modules>
  );
}

function RootNotFound() {
  return (
    <Modules>
      <AppBarDrawerLayout>
        <NotFoundTypography>404 Not Found</NotFoundTypography>
      </AppBarDrawerLayout>
    </Modules>
  );
}

function RootError({ error }: ErrorComponentProps) {
  return (
    <Modules>
      <AppBarDrawerLayout>
        <ErrorComponent error={error} />
      </AppBarDrawerLayout>
    </Modules>
  );
}
