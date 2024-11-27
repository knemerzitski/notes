import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { RouterContext } from '../router';
import { coerce, number, optional, string, type } from 'superstruct';
import { RouteNoteDialog } from '../note/components/RouteNoteDialog';
import { RouteDevModuleProvider } from '../dev/components/RouteDevModuleProvider';
import { RouteUserModuleProvider } from '../user/components/RouteUserModuleProvider';

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
      <RouteUserModuleProvider />

      <Outlet />

      {noteId && <RouteNoteDialog noteId={noteId} />}

      <RouteDevModuleProvider />
    </>
  );
}
