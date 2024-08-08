import { Box, BoxProps, styled } from '@mui/material';

export const InputsBox = styled(Box)<BoxProps>(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  overflow: 'auto',
}));
