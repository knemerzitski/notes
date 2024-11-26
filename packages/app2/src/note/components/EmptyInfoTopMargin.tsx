import { css } from '@emotion/react';
import { Box, styled } from '@mui/material';

export const EmptyInfoTopMargin = styled(Box)(
  ({ theme }) => css`
    margin-top: ${theme.spacing(12)};
  `
);
