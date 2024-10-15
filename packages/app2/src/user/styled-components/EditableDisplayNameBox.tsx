import { Box, css, styled } from '@mui/material';

export const EditableDisplayNameBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 0;
    gap: ${theme.spacing(1)};
  `
);
