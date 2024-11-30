import { Box, css, styled } from '@mui/material';

export const IconButtonsRow = styled(Box)(
  ({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
  `
);
