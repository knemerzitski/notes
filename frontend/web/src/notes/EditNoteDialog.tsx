import { Dialog } from '@mui/material';
import { useRef } from 'react';

import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import { Note } from '../schema/__generated__/graphql';
import useDeleteNote from '../schema/notes/hooks/useDeleteNote';
import useUpdateNote from '../schema/notes/hooks/useUpdateNote';

import NoteEditor from './NoteEditor';

export default function EditNoteDialog({
  note,
  open,
  onClosing,
  onClosed,
}: {
  note: Note;
  open: boolean;
  onClosing: () => void;
  onClosed: () => void;
}) {
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();

  async function handleNoteChange(updatedNote: Omit<Note, 'id'>) {
    if (
      !(await updateNote({
        id: note.id,
        title: updatedNote.title,
        content: updatedNote.content,
      }))
    ) {
      showError(`Failed to update note`);
      return false;
    }
  }

  async function handleDeleteNote() {
    if (!(await deleteNote(note.id))) {
      showError(`Failed to delete note`);
      return false;
    }
    return true;
  }

  const isClosingRef = useRef(false);

  function handleClose() {
    isClosingRef.current = true;
    onClosing();
  }

  function handleTransitionEnd() {
    if (!isClosingRef.current) return;

    onClosed();

    isClosingRef.current = false;
  }

  return (
    <Dialog
      onClose={handleClose}
      onTransitionExited={handleTransitionEnd}
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        variant: 'outlined',
        elevation: 0,
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <NoteEditor
        note={note}
        onChange={(e) => {
          void handleNoteChange(e);
        }}
        onDelete={handleDeleteNote}
        onClose={handleClose}
        slotProps={{
          titleField: {
            sx: {
              '.MuiInputBase-root': {
                fontSize: '1.2em',
              },
            },
          },
        }}
      />
    </Dialog>
  );
}
