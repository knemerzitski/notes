import { css, styled, Typography } from '@mui/material';

export const SessionExpired = styled(Typography)(
  ({ theme }) => css`
    font-size: 0.7rem;
    line-height: 0.7rem;
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: ${theme.shape.borderRadius}px;
    padding: ${theme.spacing(0.75)};
  `
);
