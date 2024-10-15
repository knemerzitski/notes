import { Box, css, styled } from '@mui/material';

export const UsersInfoColumn = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    gap: ${theme.spacing(3)};
  `
);
