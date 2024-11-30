import { css, Dialog, styled } from '@mui/material';
import { CollabInputsColumn } from './CollabInputsColumn';
import { NoteToolbar } from './NoteToolbar';
import { forwardRef } from 'react';

export const NoteDialog = forwardRef<HTMLDivElement, Parameters<typeof DialogStyled>[0]>(
  function NoteDialog(
    { open = true, maxWidth = 'sm', fullWidth = true, PaperProps, ...restProps },
    ref
  ) {
    return (
      <DialogStyled
        ref={ref}
        open={open}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        PaperProps={{
          variant: 'outlined',
          elevation: 0,
          ...PaperProps,
        }}
        {...restProps}
      >
        <CollabInputsColumn />
        <NoteToolbar />
      </DialogStyled>
    );
  }
);

const DialogStyled = styled(Dialog)(
  ({ theme }) => css`
    .MuiDialog-container > .MuiPaper-root {
      border-radius: ${theme.shape.borderRadius * 2}px;
      border: ${theme.palette.mode === 'light' ? 'transparent' : undefined};
    }
  `
);
