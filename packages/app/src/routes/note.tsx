import { useApolloClient } from '@apollo/client';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { boolean, Infer, object, optional, string, type, unknown } from 'superstruct';

import { Note, NotePendingStatus } from '../__generated__/graphql';
import { RedirectNoteNotFound } from '../note/components/RedirectNoteNotFound';
import { RouteEditNotePage } from '../note/components/RouteEditNotePage';
import { NoteIdProvider } from '../note/context/note-id';
import { useCreateNote } from '../note/hooks/useCreateNote';

import { useNavigateToNote } from '../note/hooks/useNavigateToNote';
import { getNotePendingStatus } from '../note/models/local-note/get-status';
import { clearNoteHiddenInList } from '../note/models/local-note/hidden-in-list';
import { addNoteToConnection } from '../note/models/note-connection/add';

const searchSchema = type({
  originalLocation: optional(
    object({
      pathname: string(),
      search: unknown(),
    })
  ),
  focus: optional(boolean()),
});

export type OriginalLocation = Infer<typeof searchSchema.schema.originalLocation>;

export const Route = createFileRoute('/note/$noteId')({
  component: NoteRouteComponent,
  validateSearch: (search) => searchSchema.create(search),
});

function NoteRouteComponent() {
  const { noteId } = Route.useParams();

  const client = useApolloClient();

  const isNewNote =
    getNotePendingStatus(
      {
        noteId,
      },
      client.cache
    ) === NotePendingStatus.EMPTY;

  if (isNewNote) {
    return <NoteNewCreatingRedirect />;
  }

  // memo it when redirecting?

  return <Edit key={noteId} noteId={noteId} />;
}

/**
 * Temporary until note has been created
 */
function NoteNewCreatingRedirect() {
  const { noteId } = Route.useParams();
  const { focus } = Route.useSearch({});

  const client = useApolloClient();
  const navigateToNote = useNavigateToNote();

  const isCreateCalledRef = useRef(false);
  const { noteId: createNoteId, create } = useCreateNote();

  // Create note immediately and add to connection list
  useEffect(() => {
    if (isCreateCalledRef.current) {
      return;
    }
    isCreateCalledRef.current = true;

    void create();

    // Add to connection
    clearNoteHiddenInList(
      {
        noteId,
      },
      client.cache
    );
    addNoteToConnection(
      {
        noteId,
      },
      client.cache
    );
  }, [create, noteId, client.cache]);

  // When note is created, redirect
  useEffect(() => {
    if (noteId === createNoteId || !isCreateCalledRef.current) {
      return;
    }

    // simply mask it but don't actually go there?
    void navigateToNote(createNoteId, {
      replace: true,
      focus,
    });
  }, [noteId, createNoteId, navigateToNote, focus]);

  return <Edit noteId={createNoteId} />;
}

function Edit({ noteId }: { noteId: Note['id'] }) {
  const { originalLocation, focus } = Route.useSearch({});

  return (
    <NoteIdProvider noteId={noteId}>
      <RedirectNoteNotFound
        navigateOptions={{
          to: '/notes',
        }}
      >
        <RouteEditNotePage
          originalLocation={originalLocation}
          EditNotePageProps={{
            focus,
          }}
        />
      </RedirectNoteNotFound>
    </NoteIdProvider>
  );
}
