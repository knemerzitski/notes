import { Box, css, styled } from '@mui/material';
import { columnStyle } from '../styles/column';

export const FullWidthColumnBox = styled(Box)(
  columnStyle,
  css`
    width: 100%;
  `
);
