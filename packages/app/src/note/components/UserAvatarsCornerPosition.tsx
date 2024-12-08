import { Box, css, styled } from '@mui/material';

export const UserAvatarsCornerPosition = styled(Box)(
  ({ theme }) => css`
    position: absolute;

    top: ${theme.spacing(1.5)};
    translate: 0% -100%;

    ${theme.breakpoints.up('xs')} {
      right: ${theme.spacing(-0.5)};
    }

    ${theme.breakpoints.up('sm')} {
      right: ${theme.spacing(-1.5)};
    }
  `
);
