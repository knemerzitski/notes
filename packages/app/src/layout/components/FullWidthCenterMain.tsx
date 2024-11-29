import { Box, css, styled } from '@mui/material';

export const FullWidthCenterMain = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    width: 100%;
    gap: ${theme.spacing(5)};
  `
);
