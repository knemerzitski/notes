import { Box } from '@mui/material';
import { ReactNode } from '@tanstack/react-router';

export function DashRow({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexFlow: 'row nowrap',
        gap: 1,
      }}
    >
      {children}
    </Box>
  );
}
