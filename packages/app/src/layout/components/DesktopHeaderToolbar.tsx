import { css, Divider, styled, Toolbar } from '@mui/material';

import { TopRightUsersInfoPopoverButton } from '../../user/components/TopRightUsersInfoPopoverButton';
import { AppStatusRefreshButton } from '../../utils/components/AppStatusRefreshButton';
import { IconButtonsRow } from '../../utils/components/IconButtonsRow';
import { SettingsButton } from '../../utils/components/SettingsButton';

import { RouteSearchNotesInputDebounced } from './RouteSearchNotesDebounced';
import { ToggleAppDrawerButton } from './ToggleAppDrawerButton';

export function DesktopHeaderToolbar() {
  return (
    <ToolbarStyled>
      <ToggleAppDrawerButton
        IconButtonProps={{
          edge: 'start',
        }}
      />
      <RouteSearchNotesStyled />
      <DividerStyled orientation="vertical" />
      <IconButtonsRow>
        <AppStatusRefreshButton />
        <SettingsButton />
        <TopRightUsersInfoPopoverButton />
      </IconButtonsRow>
    </ToolbarStyled>
  );
}

const RouteSearchNotesStyled = styled(RouteSearchNotesInputDebounced)(
  ({ theme }) => css`
    margin-left: ${theme.spacing(0.5)};
  `
);

const DividerStyled = styled(Divider)(
  ({ theme }) => css`
    height: 28px;
    margin: ${theme.spacing(1)};
  `
);

const ToolbarStyled = styled(Toolbar)(css`
  justify-content: space-between;
`);
