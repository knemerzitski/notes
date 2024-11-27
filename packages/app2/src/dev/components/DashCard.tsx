import { Paper, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function DashCard({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <Paper
      elevation={4}
      sx={{
        display: 'flex',
        flexFlow: 'column nowrap',
        p: 1,
      }}
    >
      {label && <Typography variant="overline">{label}</Typography>}
      {children}
    </Paper>
  );
}
