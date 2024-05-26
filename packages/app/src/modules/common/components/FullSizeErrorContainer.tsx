import { Box, Paper, Typography } from '@mui/material';

interface FullSizeErrorContainerProps {
  message: string;
  stack?: string | null;
}

export default function FullSizeErrorContainer({
  message,
  stack,
}: FullSizeErrorContainerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        mx: 'auto',
        px: 3,
        gap: 4,
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="body1" mt={1} fontSize="1.5em">
          Sorry, an unexpected error has occurred!
        </Typography>

        <Typography mt={3} fontSize="1.1em">
          {message}
        </Typography>

        {stack && (
          <Paper
            variant="elevation"
            elevation={7}
            sx={{
              mt: 2,
              p: 2,
            }}
          >
            <Typography whiteSpace="pre-wrap">{stack}</Typography>
          </Paper>
        )}
      </Box>
      <Box flexGrow={1}></Box>
    </Box>
  );
}
