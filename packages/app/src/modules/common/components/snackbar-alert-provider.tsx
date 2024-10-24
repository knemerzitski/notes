import {
  Alert,
  AlertProps,
  Box,
  Button,
  Snackbar,
  SnackbarCloseReason,
  SnackbarProps,
  styled,
} from '@mui/material';
import {
  ReactNode,
  SyntheticEvent,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useIsRenderingFab } from './rendered-fabs-tracking-provider';

type AlertAndSnackProps = AlertProps & {
  snackbarProps?: Omit<SnackbarProps, 'open'>;
  /**
   * @default false
   */
  clickAwayClose?: boolean;
};

const SnackbarAlertContext = createContext<
  ((props: AlertAndSnackProps | string) => () => void) | null
>(null);

/**
 *
 * @returns function to display single Snackbar at a time, replacing old one
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbarAlert() {
  const ctx = useContext(SnackbarAlertContext);
  if (ctx === null) {
    throw new Error('useSnackbarAlert() requires context <SnackbarAlertProvider>');
  }
  return ctx;
}

/**
 * @returns Simplified function to display an error message
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbarError() {
  const showAlert = useSnackbarAlert();

  return useCallback(
    (message: string) => {
      showAlert({
        snackbarProps: {
          anchorOrigin: { vertical: 'top', horizontal: 'center' },
        },
        severity: 'error',
        children: message,
      });
    },
    [showAlert]
  );
}

const ButtonUndoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  justifyContent: 'space-between',
}));

// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbarUndoAction() {
  const showAlert = useSnackbarAlert();

  return useCallback(
    (message: string, onUndo: () => void) => {
      const closeAlert = showAlert({
        children: (
          <ButtonUndoBox>
            {message}
            <Button
              color="primary"
              variant="text"
              onClick={() => {
                closeAlert();
                onUndo();
              }}
            >
              Undo
            </Button>
          </ButtonUndoBox>
        ),
        icon: false,
      });
    },
    [showAlert]
  );
}

export function SnackbarAlertProvider({ children }: { children: ReactNode }) {
  const isRenderingFab = useIsRenderingFab();

  const [queuedSnacks, setQueuedSnacks] = useState<readonly AlertAndSnackProps[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [activeSnack, setActiveSnack] = useState<AlertAndSnackProps | null>(null);

  useEffect(() => {
    const firstSnack = queuedSnacks[0];
    if (!firstSnack) return;

    if (!activeSnack) {
      setOpen(true);
      setActiveSnack(firstSnack);
      setQueuedSnacks((prev) => prev.slice(1));
    } else if (open) {
      setOpen(false);
    }
  }, [activeSnack, queuedSnacks, open]);

  const addSnackToQueue = useCallback((newSnack: AlertAndSnackProps | string) => {
    if (typeof newSnack === 'string') {
      newSnack = {
        children: newSnack,
      };
    }
    setQueuedSnacks((prev) => [...prev, newSnack]);

    return () => {
      setOpen(false);
    };
  }, []);

  if (!activeSnack) {
    return (
      <SnackbarAlertContext.Provider value={addSnackToQueue}>
        {children}
      </SnackbarAlertContext.Provider>
    );
  }

  const { key, snackbarProps, clickAwayClose, ...restProps } = activeSnack;

  function handleClose(
    _event: SyntheticEvent<unknown> | Event,
    reason?: SnackbarCloseReason
  ) {
    if (!clickAwayClose && reason === 'clickaway') return;

    setOpen(false);
  }

  function handleExited() {
    setActiveSnack(null);
  }

  const anchorOrigin = snackbarProps?.anchorOrigin ?? {
    vertical: 'bottom',
    horizontal: 'left',
  };
  const adjustToMobileFab = isRenderingFab && anchorOrigin.vertical === 'bottom';

  return (
    <SnackbarAlertContext.Provider value={addSnackToQueue}>
      {children}

      <Snackbar
        key={key}
        open={open}
        autoHideDuration={10000}
        onClose={handleClose}
        TransitionProps={{ onExited: handleExited }}
        anchorOrigin={anchorOrigin}
        sx={{ bottom: adjustToMobileFab ? { xs: 90, sm: 24 } : undefined }}
        {...snackbarProps}
      >
        <Alert
          severity="info"
          icon={restProps.severity ? undefined : false}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClose={handleClose}
          {...restProps}
        />
      </Snackbar>
    </SnackbarAlertContext.Provider>
  );
}
