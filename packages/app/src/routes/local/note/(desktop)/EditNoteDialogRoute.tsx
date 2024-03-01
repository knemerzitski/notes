import { useSuspenseQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';

import { gql } from '../../../../__generated__/gql';
import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../../components/feedback/RouteClosable';
import EditNoteDialog from '../../../../components/notes/edit/EditNoteDialog';
import useNotes from '../../../../local-state/note/hooks/useNotes';

const QUERY = gql(`
  query LocalEditNoteDialogRoute($id: ID!) {
    localNote(id: $id) @client {
      id
      title
      textContent
    }
  }
`);

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const params = useParams<'id'>();

  const { data } = useSuspenseQuery(QUERY, {
    variables: {
      id: params.id ?? '',
    },
  });

  const {
    operations: { updateNote, deleteNote },
  } = useNotes();

  const noteId = String(data.localNote.id);

  const note = {
    title: data.localNote.title,
    content: data.localNote.textContent,
  };

  const handleChangedNote = ({ title, content }: { title: string; content: string }) => {
    updateNote({
      id: noteId,
      title,
      textContent: content,
    });
    return Promise.resolve();
  };

  function handleDeleteNote() {
    return Promise.resolve(deleteNote(noteId));
  }

  return (
    <EditNoteDialog
      slotProps={{
        dialog: {
          open,
          onClose: onClosing,
          onTransitionExited: onClosed,
        },
        editor: {
          titleFieldProps: {
            value: note.title,
            onChange: (e) => {
              const newTitle = String(e.target.value);
              void handleChangedNote({
                title: newTitle,
                content: note.content,
              });
            },
          },
          contentFieldProps: {
            value: note.content,
            onChange: (e) => {
              const newContent = String(e.target.value);
              void handleChangedNote({
                title: note.title,
                content: newContent,
              });
            },
          },
          onClose: onClosing,
          onDelete: handleDeleteNote,
        },
      }}
    />
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
