import { Dialog, DialogProps } from '@mui/material';

import NoteEditor, { NoteEditorProps } from './NoteEditor';

export interface EditNoteDialogProps {
  slotProps: {
    dialog: DialogProps;
    editor: NoteEditorProps;
  };
}

export default function EditNoteDialog({ slotProps }: EditNoteDialogProps) {
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
        slotProps={{
          ...slotProps.editor.slotProps,
          titleField: {
            ...slotProps.editor.slotProps?.titleField,
            sx: {
              '.MuiInputBase-root': {
                fontSize: '1.2em',
              },
              ...slotProps.editor.slotProps?.titleField?.sx,
            },
          },
        }}
      />
    </Dialog>
  );
}
