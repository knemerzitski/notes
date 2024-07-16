import { Box, CircularProgress } from '@mui/material';
import { ReactNode } from 'react';

export interface CircularProgressOverlayProps {
  enabled: boolean;
  children: ReactNode;
}

/**
 * When enabled, disables all pointer events on children.
 */
export default function CircularProgressOverlay({
  enabled,
  children,
}: CircularProgressOverlayProps) {
  if (!enabled) {
    return children;
  }

  return (
    <Box
      aria-disabled={true}
      sx={{
        width: '100%',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: 0.75,
        }}
      >
        {children}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
        }}
      >
        <CircularProgress size="32px" />
      </Box>
    </Box>
  );
}
