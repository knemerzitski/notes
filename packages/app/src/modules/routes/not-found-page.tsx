import { Box, Typography } from '@mui/material';

export function NotFoundPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: '100%',
      }}
    >
      <Typography fontSize="2rem" fontWeight="fontWeightBold">
        404 Not Found
      </Typography>
    </Box>
  );
}
