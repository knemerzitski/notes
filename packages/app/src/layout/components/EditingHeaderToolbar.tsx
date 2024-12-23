import { css, styled, Toolbar } from '@mui/material';

import { AppStatusRefreshButton } from '../../utils/components/AppStatusRefreshButton';
import { BackCloseIconButton } from '../../utils/components/BackCloseIconButton';

export function EditingHeaderToolbar() {
  return (
    <ToolbarStyled>
      <BackCloseIconButton edge="start" aria-label="back" size="large" />
      <AppStatusRefreshButton edge="end" />
    </ToolbarStyled>
  );
}

const ToolbarStyled = styled(Toolbar)(css`
  justify-content: space-between;
`);
