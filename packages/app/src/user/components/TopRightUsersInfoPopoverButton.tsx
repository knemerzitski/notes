import { forwardRef, useState } from 'react';

import { gql } from '../../__generated__';

import { UsersInfoPopoverButton } from './UsersInfoPopoverButton';
import { DemoHint } from '../../demo/components/DemoHint';
import { css, styled, Theme } from '@mui/material';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { alpha } from '@mui/material/styles';
import { isDemoEnabled } from '../../demo/utils/is-demo-enabled';
import { useIsMobile } from '../../theme/context/is-mobile';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';

const _TopRightUsersInfoPopoverButton_UserFragment = gql(`
  fragment TopRightUsersInfoPopoverButton_UserFragment on User {
    ...UsersInfoPopoverButton_UserFragment
  }
`);

export const TopRightUsersInfoPopoverButton = forwardRef<
  HTMLButtonElement,
  Parameters<typeof UsersInfoPopoverButton>[0]
>(function TopRightUsersInfoPopoverButton(props, ref) {
  const isMobile = useIsMobile();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const [demoHintSeen = true, setDemoHintSeen] = useLocalStorage<boolean>(
    'demoHintSeen',
    false
  );
  const showDemoHint = !demoHintSeen;

  function handleClickDemoHintSeen() {
    setDemoHintSeen(true);
  }

  return (
    <>
      {isDemoEnabled() && anchorEl !== null && (
        <DemoHint
          open={showDemoHint}
          anchorEl={anchorEl}
          placement="left"
          onDismiss={handleClickDemoHintSeen}
        />
      )}

      <UsersInfoPopoverButtonStyled
        ref={(el) => {
          if (typeof ref === 'function') {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }

          setAnchorEl(el);
        }}
        edge="end"
        {...props}
        onClick={handleClickDemoHintSeen}
        isMobile={isMobile}
        pulseAnimation={showDemoHint}
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
          ...props.PopoverProps,
        }}
      />
    </>
  );
});

const UsersInfoPopoverButtonStyled = styled(UsersInfoPopoverButton, {
  shouldForwardProp: mergeShouldForwardProp(['pulseAnimation', 'isMobile']),
})<{
  pulseAnimation?: boolean;
  isMobile?: boolean;
}>(({
  theme,
  pulseAnimation,
  isMobile,
}: {
  theme: Theme;
  pulseAnimation?: boolean;
  isMobile?: boolean;
}) => {
  if (!pulseAnimation) {
    return;
  }

  if (isMobile) {
    return css`
      animation: pulse 2s infinite;
      @keyframes pulse {
        0%,
        100% {
          outline: 2px solid ${alpha(theme.palette.secondary.dark, 0.9)};
        }
        50% {
          outline: 2px solid ${alpha(theme.palette.secondary.dark, 0)};
        }
      }
    `;
  }

  return css`
    animation: pulse 2s infinite;
    @keyframes pulse {
      0%,
      100% {
        box-shadow: inset 0 0 0 8px ${alpha(theme.palette.secondary.dark, 0)};
      }
      50% {
        box-shadow: inset 0 0 0 0 ${alpha(theme.palette.secondary.dark, 0.9)};
      }
    }
  `;
});
