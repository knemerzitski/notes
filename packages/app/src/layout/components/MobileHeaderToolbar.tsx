import { Box, css, styled, Toolbar } from '@mui/material';

import { TopRightUsersInfoPopoverButton } from '../../user/components/TopRightUsersInfoPopoverButton';

import { AppStatusIcon } from '../../utils/components/AppStatusIcon';

import { RouteSearchNotesInputDebounced } from './RouteSearchNotesDebounced';
import { ToggleAppDrawerButton } from './ToggleAppDrawerButton';

export function MobileHeaderToolbar() {
  return (
    <ToolbarStyled disableGutters={true}>
      <RouteSearchNotesInputDebounced
        searchIconDisabled={true}
        slots={{
          prefix: (
            <ToggleAppDrawerButton
              IconButtonProps={{
                edge: 'start',
                size: 'medium',
              }}
            />
          ),
          suffix: (
            <SuffixBox>
              <AppStatusIconBox>
                <AppStatusIcon
                  visibleStatuses={['loading', 'synchronized', 'offline']}
                  duration={1500}
                />
              </AppStatusIconBox>
              <TopRightUsersInfoPopoverButtonStyled edge={undefined} size="medium" />
            </SuffixBox>
          ),
        }}
      />
    </ToolbarStyled>
  );
}

const ToolbarStyled = styled(Toolbar)(
  ({ theme }) => css`
    padding-left: ${theme.spacing(1)};
    padding-right: ${theme.spacing(1)};
  `
);

const TopRightUsersInfoPopoverButtonStyled = styled(TopRightUsersInfoPopoverButton)(
  ({ theme }) => css`
    padding: 0;
    margin-right: ${theme.spacing(0.5)};
  `
);

const SuffixBox = styled(Box)(css`
  position: relative;
`);

const AppStatusIconBox = styled(Box)(
  ({ theme }) => css`
    position: absolute;

    left: ${theme.spacing(-4)};
    top: calc(50% - 1px);

    transform: translate(0, -50%);

    font-size: ${theme.spacing(3)};
  `
);
