import { css, styled, Box, Paper } from '@mui/material';

import { forwardRef } from 'react';

import { NoteAlwaysButtons } from './NoteAlwaysButtons';
import { NoteEditingButtons } from './NoteEditingButtons';
import { NoteMoreOptionsButton } from './NoteMoreOptionsButton';

export const MobileNoteToolbar = forwardRef<
  HTMLDivElement,
  Parameters<typeof PaperStyled>[0]
>(function MobileNoteToolbar({ elevation = 0, ...restProps }, ref) {
  return (
    <PaperStyled ref={ref} elevation={elevation} {...restProps}>
      <SpaceBetweenBox>
        <ButtonsBox>
          <NoteAlwaysButtons />
          <NoteEditingButtons />
        </ButtonsBox>
        <NoteMoreOptionsButton />
      </SpaceBetweenBox>
    </PaperStyled>
  );
});

const PaperStyled = styled(Paper)(({ theme }) => {
  if (theme.palette.mode === 'light') {
    return css`
      background-color: ${theme.palette.grey['100']};
    `;
  }
  return;
});

const SpaceBetweenBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${theme.spacing(1)};
  `
);

const ButtonsBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    gap: ${theme.spacing(1)};
  `
);
