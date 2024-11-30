import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_root_layout/note/$noteId')({
  component: Note,
});

function Note() {
  const { noteId } = Route.useParams();

  // TODO on mobile show full page, on desktop show dialog
  return (
    <Navigate
      to="/"
      search={{
        noteId,
      }}
      mask={{
        to: '/note/$noteId',
        params: {
          noteId,
        },
      }}
    />
  );
}
