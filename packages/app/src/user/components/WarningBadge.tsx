import { Badge } from '@mui/material';
import { ReactElement } from 'react';

export function WarningBadge({ children }: { children: ReactElement }) {
  return (
    <Badge badgeContent="!" color="warning">
      {children}
    </Badge>
  );
}
