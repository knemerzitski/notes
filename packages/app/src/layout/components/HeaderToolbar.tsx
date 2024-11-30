import { css, styled, Toolbar } from '@mui/material';
import { UsersInfoPopoverButton } from '../../user/components/UsersInfoPopoverButton';
import { ToggleAppDrawerButton } from './ToggleAppDrawerButton';
import { AppStatusRefreshButton } from '../../utils/components/AppStatusRefreshButton';
import { SettingsButton } from '../../utils/components/SettingsButton';
import { IconButtonsRow } from '../../utils/components/IconButtonsRow';

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
