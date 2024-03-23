import { Dialog, DialogProps } from '@mui/material';

export default function NoteDialog(props: DialogProps) {
  return (
    <Dialog
      maxWidth="sm"
      fullWidth
      {...props}
      PaperProps={{
        variant: 'outlined',
        elevation: 0,
        ...props.PaperProps,
        sx: {
          borderRadius: 2,
          ...props.PaperProps?.sx,
        },
      }}
    />
  );
}
