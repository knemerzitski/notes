import { css, Dialog, DialogProps, styled } from '@mui/material';
import { CollabInputsColumn } from './CollabInputsColumn';
import { NoteToolbar } from './NoteToolbar';

export function NoteDialog(props?: DialogProps) {
  return (
    <DialogStyled open={true} {...props}>
      <CollabInputsColumn />
      <NoteToolbar />
    </DialogStyled>
  );
}

const DialogStyled = styled(Dialog)(
  ({ theme }) => css`
    .MuiDialog-container > .MuiPaper-root {
      border-radius: ${theme.shape.borderRadius * 2}px;
      border: ${theme.palette.mode === 'light' ? 'transparent' : undefined};
    }
  `
);

DialogStyled.defaultProps = {
  maxWidth: 'sm',
  fullWidth: true,
  PaperProps: {
    variant: 'outlined',
    elevation: 0,
  },
};
