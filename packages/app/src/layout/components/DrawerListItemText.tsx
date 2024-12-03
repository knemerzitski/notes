import { css, styled, ListItemText, ListItemTextProps, Theme } from '@mui/material';

import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { useIsAppDrawerOpen, useIsAppDrawerFloating } from '../context/app-drawer-state';

export function DrawerListItemText(props: ListItemTextProps) {
  const isDrawerOpen = useIsAppDrawerOpen();
  const isDrawerFloating = useIsAppDrawerFloating();

  const isDrawerExpanded = isDrawerOpen || isDrawerFloating;

  return <ListItemTextStyled {...props} isDrawerExpanded={isDrawerExpanded} />;
}

const drawerExpand = {
  style: ({
    isDrawerExpanded = false,
    theme,
  }: { isDrawerExpanded?: boolean } & { theme: Theme }) => {
    if (isDrawerExpanded) {
      return css`
        margin-left: ${theme.spacing(2)};
        opacity: 1;
      `;
    }

    return css`
      margin-left: auto;
      opacity: 0;
    `;
  },
  props: ['isDrawerExpanded'],
};

const ListItemTextStyled = styled(ListItemText, {
  shouldForwardProp: mergeShouldForwardProp(drawerExpand.props),
})<{ isDrawerExpanded?: boolean }>(drawerExpand.style);
