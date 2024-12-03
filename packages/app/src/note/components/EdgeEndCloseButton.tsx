import { css, styled } from '@mui/material';

import { CloseButton } from './CloseButton';

export const EdgeEndCloseButton = styled(CloseButton)(
  ({ theme }) => css`
    margin-inline-end: ${theme.spacing(1)};
  `
);
