import { css, styled, Toolbar } from '@mui/material';

import { UsersInfoPopoverButton } from '../../user/components/UsersInfoPopoverButton';

import { AppStatusRefreshButton } from '../../utils/components/AppStatusRefreshButton';
import { IconButtonsRow } from '../../utils/components/IconButtonsRow';
import { SettingsButton } from '../../utils/components/SettingsButton';

import { ToggleAppDrawerButton } from './ToggleAppDrawerButton';

export function HeaderToolbar() {
  return (
    <ToolbarStyled>
      <ToggleAppDrawerButton
        IconButtonProps={{
          edge: 'start',
        }}
      />
      <IconButtonsRow>
        <AppStatusRefreshButton />
        <SettingsButton />
        <UsersInfoPopoverButton
          ButtonProps={{
            edge: 'end',
          }}
          PopoverProps={{
            keepMounted: true,
            transformOrigin: {
              vertical: 'top',
              horizontal: 'right',
            },
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'right',
            },
          }}
        />
      </IconButtonsRow>
    </ToolbarStyled>
  );
}

const ToolbarStyled = styled(Toolbar)(css`
  justify-content: space-between;
`);
