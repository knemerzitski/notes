import { ClickAwayListener, InputProps, Paper, PaperProps } from '@mui/material';
import { useState } from 'react';

import { useSnackbarError } from '../../feedback/SnackbarAlertProvider';
import PlainInput from '../../inputs/PlainInput';

interface Note {
  title: string;
  content: string;
}

export interface CreateNoteWidgetProps extends PaperProps {
  onCreated: (title: string, content: string) => Promise<boolean>;
  contentFieldProps?: InputProps;
}

export default function CreateNoteWidget({
  onCreated,
  contentFieldProps,
  ...restProps
}: CreateNoteWidgetProps) {
  const [note, setNote] = useState<Note>({
    title: '',
    content: '',
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const showError = useSnackbarError();

  function setContentAndOpenEditor(textContent = '') {
    if (!isEditorOpen) {
      setNote((prev) => ({
        ...prev,
        textContent,
      }));
      setIsEditorOpen(true);
    }
  }

  // function handleNoteChange(updatedNote: Note) {
  //   setNote(updatedNote);
  // }

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
      if (!(await onCreated(note.title, note.content))) {
        showError('Failed to create note');
        return;
      }
    }
    reset();
  }

  // function handleDeleteNote() {
  //   reset();
  //   return true;
  // }

  return (
    <>
      <Paper
        variant="outlined"
        {...restProps}
        sx={{
          px: 2,
          py: 2,
          borderRadius: 2,
          boxShadow: 3,
          display: isEditorOpen ? 'none' : undefined,
          ...restProps.sx,
        }}
      >
        <PlainInput
          placeholder="Take a note..."
          {...contentFieldProps}
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
            {...restProps}
            sx={{
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1,
              display: undefined,
              ...restProps.sx,
            }}
          >
            {/* TODO */}
            {/* <NoteEditor
              note={note}
              onTitleChange={handleNoteChange}
              onDelete={() => {
                return Promise.resolve(handleDeleteNote());
              }}
              onClose={() => {
                void handleOnClose();
              }}
              slotProps={{
                contentField: slotProps?.contentField,
              }}
            /> */}
          </Paper>
        </ClickAwayListener>
      )}
    </>
  );
}
