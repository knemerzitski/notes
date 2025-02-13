import { Box, css, styled, Toolbar } from '@mui/material';

import { CloseSelectedNotesIconButton } from '../../note/components/CloseSelectedNotesIconButton';
import { SelectedNotesCount } from '../../note/components/SelectedNotesCount';

import { SelectedNotesMoreOptionsButton } from './SelectedNotesMoreOptionsButton';

export function SelectedNotesHeaderToolbar() {
  return (
    <ToolbarStyled>
      <LeftBox>
        <CloseSelectedNotesIconButton />
        <SelectedNotesCount />
      </LeftBox>
      <SelectedNotesMoreOptionsButton />
    </ToolbarStyled>
  );
}

const ToolbarStyled = styled(Toolbar)(css`
  display: flex;
  justify-content: space-between;
`);

const LeftBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
  `
);
