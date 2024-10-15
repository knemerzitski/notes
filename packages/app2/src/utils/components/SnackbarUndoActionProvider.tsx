import { ReactNode } from '@tanstack/react-router';
import { useCallback, useId } from 'react';
import { useShowSnackbarAlert } from '../context/snackbar-alert';
import { UndoActionClosure, UndoActionProvider } from '../context/undo-action';
import { Button } from '@mui/material';
import { TwoElementBox } from '../styled-components/TwoElementBox';

export function SnackbarUndoActionProvider({ children }: { children: ReactNode }) {
  const id = useId();
  const showSnackbarAlert = useShowSnackbarAlert();

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
            <TwoElementBox>
              {message}
              <Button
                aria-label={`undo ${message}`}
                color="primary"
                variant="text"
                onClick={handleClickUndo}
              >
                Undo
              </Button>
            </TwoElementBox>
          ),
        },
        modalOptions: {
          key: id,
        },
      });

      return;
    },
    [showSnackbarAlert, id]
  );

  return (
    <UndoActionProvider onUndoAction={handleUndoAction}>{children}</UndoActionProvider>
  );
}
