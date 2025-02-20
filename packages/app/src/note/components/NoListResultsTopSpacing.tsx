import { css } from '@emotion/react';
import { Box, styled } from '@mui/material';

export const NoListResultsTopSpacing = styled(Box)(
  ({ theme }) => css`
    margin-top: ${theme.spacing(12)};
  `
);
