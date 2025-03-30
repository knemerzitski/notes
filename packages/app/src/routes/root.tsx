import {
  ErrorComponentProps,
  Outlet,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router';

import { ReactNode, useEffect, useState } from 'react';
import { boolean, coerce, number, optional, string, type } from 'superstruct';

import { gql } from '../__generated__';
import { AppBarDrawerLayout } from '../layout/components/AppBarDrawerLayout';
import { RedirectLinkSharedNote } from '../note/components/RedirectLinkSharedNote';
import { RedirectToMobileNote } from '../note/components/RedirectToMobileNote';
import { RouteNoteDialog } from '../note/components/RouteNoteDialog';
import { RouteNoteSharingDialog } from '../note/components/RouteNoteSharingDialog';
import { RootRoute } from '../root-route';
import { RouterContext } from '../router';
import { loaderUserFetchLogic } from '../router/utils/loader-user-fetch-logic';
import { useIsMobile } from '../theme/context/is-mobile';
import { RouteSignInDialog } from '../user/components/RouteSignInDialog';
import { ErrorComponent } from '../utils/components/ErrorComponent';
import { NotFoundTypography } from '../utils/components/NotFoundTypography';

const RouteRoot_Query = gql(`
  query RouteRoot_Query($userBy: UserByInput!, 
    $dialogNoteBy: NoteByInput!, $ifDialog: Boolean!,
    $sharingNoteBy: NoteByInput!, $ifSharing: Boolean!
  ) {
    signedInUser(by: $userBy) {
      ...AppBarDrawerLayout_UserFragment
    }
    noteDialog: signedInUser(by: $userBy) @include(if: $ifDialog) {
      id
      note(by: $dialogNoteBy) {
        ...RouteNoteDialog_NoteFragment
      }
    }
    noteSharingDialog: signedInUser(by: $userBy) @include(if: $ifSharing) {
      id
      note(by: $sharingNoteBy) {
        ...RouteNoteSharingDialog_NoteFragment
      }
    }
  }
`);

const stringCoerceNumber = optional(coerce(string(), number(), (v) => String(v)));

const searchSchema = type({
  /**
   * Parallel route <RouteNoteDialog />
   */
  noteId: stringCoerceNumber,
  /**
   * Parallel route <RouteNoteSharingDialog />
   */
  sharingNoteId: stringCoerceNumber,
  /**
   * Parallel route <RouteSignInDialog />
   */
  signIn: optional(boolean()),
  /**
   * Redirects to note based on this share value.
   */
  share: stringCoerceNumber,
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

    const emptyNoteId = '0123456789abcdef';

    return {
      query: apolloClient
        .query({
          query: RouteRoot_Query,
          variables: {
            userBy: {
              id: userId,
            },
            dialogNoteBy: {
              id: ctx.deps.noteId ?? emptyNoteId,
            },
            sharingNoteBy: {
              id: ctx.deps.sharingNoteId ?? emptyNoteId,
            },
            ifDialog: ctx.deps.noteId != null,
            ifSharing: ctx.deps.sharingNoteId != null,
          },
          fetchPolicy,
        })
        .then(setIsSucessfullyFetched),
    };
  },
});

function Modules({ children }: { children: ReactNode }) {
  return <RootRoute>{children}</RootRoute>;
}

function Root() {
  const { noteId, sharingNoteId, share, signIn } = Route.useSearch();

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

      {noteId && <RouteNoteDialog noteId={noteId} key={`noteDialog-${dialogKey}`} />}

      {sharingNoteId && (
        <RouteNoteSharingDialog
          key={`noteSharingDialog-${dialogKey}`}
          noteId={sharingNoteId}
        />
      )}

      {signIn && <RouteSignInDialog />}
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
