import { useSuspenseQuery } from '@apollo/client';

import { gql } from '../../__generated__/gql';
import WidgetListFabLayout from '../../components/notes/layout/WidgetListFabLayout';
import { NotesListProps } from '../../components/notes/view/NotesList';
import useLocalStateNotes from '../../local-state/note/hooks/useLocalStateNotes';
import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../../router/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../../router/hooks/useAbsoluteLocation';

const QUERY = gql(`
  query LocalNotesRoute {
    localNotes @client {
      id
      title
      content
    }
  }
`);

function noteRoute(noteId: string) {
  return `/local/note/${noteId}`;
}

export default function NotesRoute() {
  const { data } = useSuspenseQuery(QUERY);

  const { createNote, deleteNote } = useLocalStateNotes();

  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const notes: NotesListProps['notes'] = data.localNotes.map(
    ({ id, title, content }) => ({
      id: String(id),
      title,
      content,
      editing: absoluteLocation.pathname === transform(noteRoute(String(id))),
    })
  );

  function handleWidgetNoteCreated(title: string, content: string) {
    createNote({
      title,
      content,
    });
    return Promise.resolve(true);
  }

  function handleFabCreate() {
    const note = createNote({
      title: '',
      content: '',
    });

    navigate(noteRoute(note.id), {
      state: {
        autoFocus: true,
      },
    });

    return Promise.resolve();
  }

  function handleStartEdit(noteId: string) {
    navigate(noteRoute(noteId));
  }

  function handleDelete(noteId: string) {
    return Promise.resolve(deleteNote(noteId));
  }

  return (
    <WidgetListFabLayout
      slotProps={{
        createNoteWidget: {
          onCreated: handleWidgetNoteCreated,
          contentFieldProps: {
            placeholder: 'Take a local note...',
          },
        },
        notesList: {
          notes,
          onStartEdit: handleStartEdit,
          onDelete: handleDelete,
        },
        createNoteFab: {
          onCreate: handleFabCreate,
        },
      }}
    />
  );
}
