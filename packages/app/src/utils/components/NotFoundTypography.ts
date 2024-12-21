import { css, styled, Typography } from '@mui/material';

export const NotFoundTypography = styled(Typography)(
  ({ theme }) => css`
    font-size: 1.5em;
    font-weight: ${theme.typography.fontWeightBold};
  `
);
