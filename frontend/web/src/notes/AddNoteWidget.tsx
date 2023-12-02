import { ClickAwayListener, Paper, PaperProps } from '@mui/material';
import { useState } from 'react';

import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import BorderlessTextField from '../components/inputs/BorderlessTextField';
import { Note } from '../schema/__generated__/graphql';
import useCreateNote from '../schema/note/hooks/useCreateNote';

import NoteEditor from './NoteEditor';

const contentFieldPlaceholder = 'Take a note...';

export default function AddNoteWidget(props: PaperProps) {
  const [note, setNote] = useState<Omit<Note, 'id'>>({
    title: '',
    content: '',
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const createNote = useCreateNote();

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
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (note.title || note.content) {
      if ((await createNote(note.title ?? '', note.content ?? '')) == null) {
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
              onClose={() => {
                void handleOnClose();
              }}
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
