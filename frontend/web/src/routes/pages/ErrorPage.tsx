import { Box, Paper, Typography } from '@mui/material';
import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const routeError = useRouteError() as { statusText?: string; status: number } | Error;
  console.error(routeError);

  const message =
    routeError instanceof Error
      ? routeError.message
      : routeError.status + (routeError.statusText ? ' ' + routeError.statusText : '');

  const stack = routeError instanceof Error ? routeError.stack : null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        width: 'min(800px, 100vw)',
        mx: 'auto',
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
            <Typography whiteSpace="pre">{stack}</Typography>
          </Paper>
        )}
      </Box>
      <Box flexGrow={1}></Box>
    </Box>
  );
}
