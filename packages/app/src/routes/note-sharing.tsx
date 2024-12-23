import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/note/sharing/$noteId')({
  component: NoteSharing,
});

function NoteSharing() {
  const { noteId } = Route.useParams();

  // Redirect to root with search
  return (
    <Navigate
      to="/"
      search={(prev) => ({
        ...prev,
        sharingNoteId: noteId,
      })}
      mask={{
        to: '/note/sharing/$noteId',
        params: {
          noteId,
        },
      }}
    />
  );
}
