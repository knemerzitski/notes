import { ClickAwayListener, Paper, PaperProps } from '@mui/material';
import { useState } from 'react';

import { Note } from '../__generated__/graphql';
import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import BorderlessTextField from '../components/inputs/BorderlessTextField';

import NoteEditor from './NoteEditor';
import useInsertNote from './graphql/useInsertNote';

const contentFieldPlaceholder = 'Take a note...';

export default function AddNoteWidget(props: PaperProps) {
  const [note, setNote] = useState<Omit<Note, 'id'>>({
    title: '',
    content: '',
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const insertNote = useInsertNote();

  const showError = useSnackbarError();

  function setContentAndOpenEditor(content = '') {
    if (!isEditorOpen) {
      setNote((prev) => ({
        ...prev,
        content,
      }));
      setIsEditorOpen(true);
    }
  }

  function handleNoteChange(updatedNote: Omit<Note, 'id'>) {
    setNote(updatedNote);
  }

  function reset() {
    setNote({
      title: '',
      content: '',
    });
    setIsEditorOpen(false);
  }

  async function handleOnClose() {
    if (note.title || note.content) {
      if ((await insertNote(note.title, note.content)) == null) {
        showError('Failed to create note');
        return;
      }
    }
    reset();
  }

  function handleDeleteNote() {
    reset();
    return true;
  }

  return (
    <>
      <Paper
        variant="outlined"
        {...props}
        sx={{
          px: 2,
          py: 2,
          borderRadius: 2,
          boxShadow: 3,
          display: isEditorOpen ? 'none' : undefined,
          ...props.sx,
        }}
      >
        <BorderlessTextField
          placeholder={contentFieldPlaceholder}
          fullWidth
          autoFocus
          value={note.content}
          onChange={(e) => {
            setContentAndOpenEditor(e.target.value);
          }}
          onClick={() => {
            setIsEditorOpen(true);
          }}
        />
      </Paper>

      {isEditorOpen && (
        <ClickAwayListener onClickAway={() => void handleOnClose()}>
          <Paper
            variant="outlined"
            {...props}
            sx={{
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1,
              display: undefined,
              ...props.sx,
            }}
          >
            <NoteEditor
              note={note}
              onChange={handleNoteChange}
              onDelete={() => {
                return Promise.resolve(handleDeleteNote());
              }}
              onClose={void handleOnClose}
              slotProps={{
                contentField: {
                  placeholder: contentFieldPlaceholder,
                },
              }}
            />
          </Paper>
        </ClickAwayListener>
      )}
    </>
  );
}
