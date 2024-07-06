import {
  Alert,
  AlertProps,
  Box,
  Button,
  Snackbar,
  SnackbarProps,
  styled,
} from '@mui/material';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type SnackbarAlertProps = AlertProps & {
  snackbarProps?: SnackbarProps;
};

interface SnackbarAlertContextProps {
  open: (props: SnackbarAlertProps) => void;
  close: () => void;
}

const SnackbarAlertContext = createContext<SnackbarAlertContextProps | null>(null);

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
  const { open: showAlert } = useSnackbarAlert();

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

export function useSnackbarUndoAction() {
  const { open: showAlert, close: closeAlert } = useSnackbarAlert();

  return useCallback(
    (message: string, onUndo: () => void) => {
      showAlert({
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
    [showAlert, closeAlert]
  );
}

export default function SnackbarAlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [propsOnOpen, setPropsOnOpen] = useState<SnackbarAlertProps>();

  const { snackbarProps, ...restPropsOnOpen } = propsOnOpen ?? {};

  const openSnackbarAlert = useCallback((props: SnackbarAlertProps) => {
    setPropsOnOpen(props);
    setOpen(true);
  }, []);

  const closeSnackbarAlert = useCallback(() => {
    setOpen(false);
  }, []);

  function handleClose() {
    setOpen(false);
  }

  const providerValue = useMemo<SnackbarAlertContextProps>(
    () => ({
      open: openSnackbarAlert,
      close: closeSnackbarAlert,
    }),
    [openSnackbarAlert, closeSnackbarAlert]
  );

  return (
    <SnackbarAlertContext.Provider value={providerValue}>
      {children}

      <Snackbar
        open={open}
        autoHideDuration={10000}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        {...snackbarProps}
      >
        <Alert severity="info" onClose={handleClose} {...restPropsOnOpen} />
      </Snackbar>
    </SnackbarAlertContext.Provider>
  );
}
