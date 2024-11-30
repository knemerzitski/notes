import { Backdrop, css, styled } from '@mui/material';

export const TopZIndexBackdrop = styled(Backdrop)(
  ({ theme }) => css`
    z-index: ${theme.zIndex.top};
  `
);
