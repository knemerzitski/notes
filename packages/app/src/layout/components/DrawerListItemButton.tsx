import { css, styled, ListItemButton, Theme, ListItemButtonProps } from '@mui/material';

import { forwardRef } from 'react';

import { useIsMobile } from '../../theme/context/is-mobile';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { useSetAppDrawerOpen } from '../context/app-drawer-state';

export const DrawerListItemButton = forwardRef<
  HTMLDivElement,
  Parameters<typeof ListItemButtonStyled>[0]
>(function DrawerListItemButton(props, ref) {
  const isMobile = useIsMobile();
  const setAppDrawerOpen = useSetAppDrawerOpen();

  // On click close drawer on mobile
  const handleClick: ListItemButtonProps['onClick'] = (e) => {
    props.onClick?.(e);

    if (isMobile) {
      setAppDrawerOpen(false);
    }
  };

  return <ListItemButtonStyled ref={ref} {...props} onClick={handleClick} />;
});

const baseStyle = ({ theme }: { theme: Theme }) => css`
  min-height: ${theme.spacing(6)};
  max-height: ${theme.spacing(6)};
  border-radius: ${theme.shape.borderRadius * 6}px;
`;

const active = {
  style: ({ active = false, theme }: { active?: boolean } & { theme: Theme }) => {
    if (!active) {
      return;
    }

    return css`
      background-color: ${theme.palette.action.selected};
      &:hover {
        background-color: ${theme.palette.action.selected};
      }
    `;
  },
  props: ['active'],
};

const ListItemButtonStyled = styled(ListItemButton, {
  shouldForwardProp: mergeShouldForwardProp(active.props),
})(baseStyle, active.style);
