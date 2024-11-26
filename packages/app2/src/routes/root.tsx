import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { Suspense } from 'react';
import { TanStackRouterDevtools } from '../utils/components/TanStackRouterDevTools';
import { RouterContext } from '../router';
import { coerce, number, optional, string, type } from 'superstruct';
import { RouteNoteDialog } from '../note/components/RouteNoteDialog';

// TODO loader for note dialog or a global first loader??

const searchSchema = type({
  noteId: optional(coerce(string(), number(), (v) => String(v))),
});

export const Route = createRootRouteWithContext<RouterContext>()({
  pendingMinMs: 0,
  pendingMs: 0,
  validateSearch: (search) => searchSchema.create(search),
  component: Root,
});

function Root() {
  const { noteId } = Route.useSearch();

  return (
    <>
      <Outlet />

      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>

      {noteId && <RouteNoteDialog noteId={noteId} />}
    </>
  );
}
