import { css, styled, Box, Paper } from '@mui/material';

import { forwardRef } from 'react';

import { EdgeEndCloseButton } from './EdgeEndCloseButton';
import { NoteAlwaysButtons } from './NoteAlwaysButtons';
import { NoteEditingButtons } from './NoteEditingButtons';
import { NoteMoreOptionsButton } from './NoteMoreOptionsButton';

export const NoteToolbar = forwardRef<HTMLDivElement, Parameters<typeof PaperStyled>[0]>(
  function NoteToolbar({ elevation = 0, ...restProps }, ref) {
    return (
      <PaperStyled ref={ref} elevation={elevation} {...restProps}>
        <SpaceBetweenBox>
          <ButtonsBox>
            <NoteAlwaysButtons />
            <NoteEditingButtons />
            <NoteMoreOptionsButton />
          </ButtonsBox>
          <EdgeEndCloseButton />
        </SpaceBetweenBox>
      </PaperStyled>
    );
  }
);

const PaperStyled = styled(Paper)(({ theme }) => {
  if (theme.palette.mode === 'light') {
    return css`
      background-color: ${theme.palette.grey['100']};
    `;
  }
  return;
});

const SpaceBetweenBox = styled(Box)(css`
  display: flex;
  justify-content: space-between;
`);

const ButtonsBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    padding: ${theme.spacing(1)};
    gap: ${theme.spacing(1)};
  `
);
