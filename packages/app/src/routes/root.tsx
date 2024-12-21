import {
  ErrorComponentProps,
  Outlet,
  createRootRouteWithContext,
  defer,
} from '@tanstack/react-router';

import { coerce, number, optional, string, type } from 'superstruct';

import { gql } from '../__generated__';
import { RouteDevModuleProvider } from '../dev/components/RouteDevModuleProvider';
import { RedirectLinkSharedNote } from '../note/components/RedirectLinkSharedNote';
import { RouteNoteDialog } from '../note/components/RouteNoteDialog';
import { RouteNoteSharingDialog } from '../note/components/RouteNoteSharingDialog';
import { RouterContext } from '../router';
import { RouteUserModuleProvider } from '../user/components/RouteUserModuleProvider';
import { routeFetchPolicy } from '../utils/route-fetch-policy';
import { NoteIdProvider } from '../note/context/note-id';
import { RedirectNoteNotFound } from '../note/components/RedirectNoteNotFound';
import { AppBarDrawerLayout } from '../layout/components/AppBarDrawerLayout';
import { NotFoundTypography } from '../utils/components/NotFoundTypography';
import { ErrorComponent } from '../utils/components/ErrorComponent';

const RouteRoot_Query = gql(`
  query RouteRoot_Query($noteId: ObjectID!) {
    noteSharingDialog: userNoteLink(by: {noteId: $noteId}) {
      id
      note {
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
  pendingComponent: Root,
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
      context: { apolloClient, fetchedRoutes },
    } = ctx;

    const routeId = `${ctx.route.id}-${JSON.stringify(ctx.deps)}`;
    const fetchPolicy = routeFetchPolicy(routeId, ctx.context);
    if (!fetchPolicy) {
      return;
    }

    if (ctx.deps.noteId != null) {
      // TODO load anything that's needed when note is open
    }

    const sharingDefer = ctx.deps.sharingNoteId
      ? defer(
          apolloClient
            .query({
              query: RouteRoot_Query,
              variables: {
                noteId: ctx.deps.sharingNoteId,
              },
              fetchPolicy,
            })
            .then(() => {
              fetchedRoutes.add(routeId);
            })
        )
      : null;

    return {
      sharingDefer,
    };
  },
});

function Root() {
  const { noteId, sharingNoteId, share } = Route.useSearch();

  return (
    <>
      <RouteUserModuleProvider />

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
            <RouteNoteDialog />
          </RedirectNoteNotFound>
        </NoteIdProvider>
      )}

      {sharingNoteId && <RouteNoteSharingDialog noteId={sharingNoteId} />}

      {share && <RedirectLinkSharedNote shareId={share} />}

      <RouteDevModuleProvider />
    </>
  );
}

function RootNotFound() {
  return (
    <AppBarDrawerLayout>
      <NotFoundTypography>404 Not Found</NotFoundTypography>
    </AppBarDrawerLayout>
  );
}

function RootError({ error }: ErrorComponentProps) {
  return (
    <AppBarDrawerLayout>
      <ErrorComponent error={error} />
    </AppBarDrawerLayout>
  );
}
