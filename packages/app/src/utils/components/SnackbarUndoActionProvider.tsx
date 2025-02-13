import { Box, Button, css, styled, useTheme } from '@mui/material';
import { ReactNode, useCallback, useId } from 'react';

import { useShowSnackbarAlert } from '../context/snackbar-alert';
import { UndoActionClosure, UndoActionProvider } from '../context/undo-action';

export function SnackbarUndoActionProvider({ children }: { children: ReactNode }) {
  const id = useId();
  const showSnackbarAlert = useShowSnackbarAlert();
  const theme = useTheme();

  const handleUndoAction: UndoActionClosure = useCallback(
    (message, undo, options) => {
      function handleClickUndo() {
        closeSnackbar();
        undo();
      }

      const closeSnackbar = showSnackbarAlert({
        onClose: (reason) => reason !== 'clickaway',
        SnackbarProps: {
          autoHideDuration: options?.duration ?? 10000,
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
        },
        AlertProps: {
          icon: false,
          severity: 'info',
          children: (
            <ButtonUndoBox>
              {message}
              <Button
                aria-label={`undo ${message}`}
                color={theme.palette.mode === 'dark' ? 'primary' : 'inherit'}
                variant="text"
                onClick={handleClickUndo}
              >
                Undo
              </Button>
            </ButtonUndoBox>
          ),
        },
        modalOptions: {
          key: `${id}:${options?.key ?? message}`,
          onRemoved: options?.onRemoved,
        },
      });

      return closeSnackbar;
    },
    [showSnackbarAlert, id, theme]
  );

  return (
    <UndoActionProvider onUndoAction={handleUndoAction}>{children}</UndoActionProvider>
  );
}

const ButtonUndoBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    gap: ${theme.spacing(2)};
    align-items: center;
    justify-content: space-between;
  `
);
