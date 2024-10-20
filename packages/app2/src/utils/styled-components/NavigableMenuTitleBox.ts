import { Box, css, styled } from '@mui/material';

export const NavigableMenuTitleBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    padding: ${theme.spacing(0.5)} ${theme.spacing(1)};
    border-bottom: 1px solid ${theme.palette.divider};
  `
);
