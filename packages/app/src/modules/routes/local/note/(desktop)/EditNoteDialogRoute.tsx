import { useSuspenseQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { gql } from '../../../../../__generated__/gql';
import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../../common/components/RouteClosable';
import useLocalStateNotes from '../../../../note-local/hooks/useLocalStateNotes';
import InputsBox from '../../../../note/components/InputsBox';
import NoteDialog from '../../../../note/components/NoteDialog';
import TitleInput from '../../../../note/components/TitleInput';
import ContentInput from '../../../../note/components/ContentInput';

const QUERY = gql(`
  query LocalEditNoteDialogRoute($id: ID!) {
    localNote(id: $id) @client {
      id
      title
      content
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

  const { updateNote, deleteNote } = useLocalStateNotes();

  const noteId = String(data.localNote.id);

  const note = {
    title: data.localNote.title,
    content: data.localNote.content,
  };

  const handleChangedNote = ({ title, content }: { title: string; content: string }) => {
    updateNote({
      id: noteId,
      title,
      content,
    });
    return Promise.resolve();
  };

  function handleDeleteNote() {
    return Promise.resolve(deleteNote(noteId));
  }

  return (
    <NoteDialog open={open} onClose={onClosing} onTransitionExited={onClosed}>
      <ToolbarBox
        onClose={onClosing}
        toolbarProps={{
          moreOptionsButtonProps: {
            onDelete: handleDeleteNote,
          },
        }}
        renderMainElement={(ref) => (
          <InputsBox ref={ref}>
            <TitleInput
              value={note.title}
              onChange={(e) => {
                const newTitle = String(e.target.value);
                void handleChangedNote({
                  title: newTitle,
                  content: note.content,
                });
              }}
            />
            <ContentInput
              value={note.content}
              onChange={(e) => {
                const newContent = String(e.target.value);
                void handleChangedNote({
                  title: note.title,
                  content: newContent,
                });
              }}
            />
          </InputsBox>
        )}
      />
    </NoteDialog>
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
