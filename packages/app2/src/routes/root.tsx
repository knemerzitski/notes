import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { RouterContext } from '../router';
import { coerce, number, optional, string, type } from 'superstruct';
import { RouteNoteDialog } from '../note/components/RouteNoteDialog';
import { RouteDevModuleProvider } from '../dev/components/RouteDevModuleProvider';
import { RouteUserModuleProvider } from '../user/components/RouteUserModuleProvider';

const searchSchema = type({
  noteId: optional(coerce(string(), number(), (v) => String(v))),
});

export const Route = createRootRouteWithContext<RouterContext>()({
  pendingMinMs: 0,
  pendingMs: 0,
  validateSearch: (search) => searchSchema.create(search),
  component: Root,
  loaderDeps: ({ search: { noteId } }) => {
    return {
      noteId,
    };
  },
  loader: ({ deps: { noteId } }) => {
    const isNoteOpen = noteId != null;
    if (isNoteOpen) {
      // TODO load anything that's needed when note is open
    }
    return;
  },
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
