import { css, styled, ListItemIcon } from '@mui/material';

export const DrawerListItemIcon = styled(ListItemIcon)(
  ({ theme }) => css`
    min-width: 0;
    margin-left: ${theme.spacing(-0.5)};
  `
);
