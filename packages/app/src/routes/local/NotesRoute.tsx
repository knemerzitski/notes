import { useSuspenseQuery } from '@apollo/client';

import WidgetListFabLayout from '../../components/notes/layout/WidgetListFabLayout';
import { NotesListProps } from '../../components/notes/view/NotesList';
import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../../router/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../../router/hooks/useAbsoluteLocation';
import { gql } from '../../local-state/__generated__';
import useNotes from '../../local-state/note/hooks/useNotes';

const QUERY = gql(`
  query LocalNotesRoute {
    localNotes @client {
      id
      title
      textContent
    }
  }
`);

function noteRoute(noteId: string) {
  return `/local/note/${noteId}`;
}

export default function NotesRoute() {
  const { data } = useSuspenseQuery(QUERY);

  const {
    operations: { createNote, deleteNote },
  } = useNotes();

  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const notes: NotesListProps['notes'] = data.localNotes.map(
    ({ id, title, textContent }) => ({
      id: String(id),
      title,
      content: textContent,
      editing: absoluteLocation.pathname === transform(noteRoute(String(id))),
    })
  );

  function handleWidgetNoteCreated(title: string, content: string) {
    createNote({
      title,
      textContent: content,
    });
    return Promise.resolve(true);
  }

  function handleFabCreate() {
    const note = createNote({
      title: '',
      textContent: '',
    });

    navigate(noteRoute(note.id), {
      state: {
        autoFocus: true,
      },
    });
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
          slotProps: {
            contentField: {
              placeholder: 'Take a local note...',
            },
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
