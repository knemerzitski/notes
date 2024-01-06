import { useSuspenseQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';

import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../components/feedback/RouteClosable';
import EditNoteDialog from '../../../components/notes/edit/EditNoteDialog';
import { NoteEditorProps } from '../../../components/notes/edit/NoteEditor';
import useDeleteNote from '../../../graphql/note/hooks/useDeleteNote';
import useUpdateNote from '../../../graphql/note/hooks/useUpdateNote';
import { gql } from '../../../local-state/__generated__/gql';

const QUERY = gql(`
  query EditNoteDialogRoute($id: ID!) {
    note(id: $id) {
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

  const { data /* , subscribeToMore */ } = useSuspenseQuery(QUERY, {
    variables: {
      id: params.id ?? '',
    },
  });

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // useEffect(() => {
  //   subscribeToMore({
  //     document: NOTE_UPDATED,
  //     updateQuery(_cache, { subscriptionData }) {
  //       const updatedNote = subscriptionData.data.noteUpdated;
  //       return {
  //         note: updatedNote,
  //       };
  //     },
  //   });
  // }, [subscribeToMore]);

  const noteId = String(data.note.id);

  const note: NoteEditorProps['note'] = {
    title: data.note.title,
    content: data.note.textContent,
  };

  const handleChangedNote: NoteEditorProps['onChange'] = async ({ title, content }) => {
    await updateNote({
      id: noteId,
      title,
      textContent: content,
    });
  };

  function handleDeleteNote() {
    return deleteNote(noteId);
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
          onClose: onClosing,
          note,
          onChange: handleChangedNote,
          onDelete: handleDeleteNote,
        },
      }}
    />
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
