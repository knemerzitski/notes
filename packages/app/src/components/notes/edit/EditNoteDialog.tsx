import { Dialog, DialogProps } from '@mui/material';
import { ReactNode } from 'react';

import NoteEditor, { NoteEditorProps } from './NoteEditor';

export interface EditNoteDialogProps {
  slotProps: {
    dialog: DialogProps;
    editor: NoteEditorProps;
  };
  children?: ReactNode;
}

export default function EditNoteDialog({ slotProps, children }: EditNoteDialogProps) {
  return (
    <Dialog
      maxWidth="sm"
      fullWidth
      {...slotProps.dialog}
      PaperProps={{
        variant: 'outlined',
        elevation: 0,
        ...slotProps.dialog.PaperProps,
        sx: {
          borderRadius: 2,
          ...slotProps.dialog.PaperProps?.sx,
        },
      }}
    >
      <NoteEditor
        {...slotProps.editor}
        titleFieldProps={{
          ...slotProps.editor.titleFieldProps,
          sx: {
            '.MuiInputBase-root': {
              fontSize: '1.2em',
            },
            ...slotProps.editor.titleFieldProps?.sx,
          },
        }}
      />
      {children}
    </Dialog>
  );
}
