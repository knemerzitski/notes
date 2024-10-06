import { Box, BoxProps, styled } from '@mui/material';

export const PageCenterBox = styled(Box)<BoxProps>(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100dvh',
}));
