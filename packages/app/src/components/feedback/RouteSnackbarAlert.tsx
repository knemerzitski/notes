import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';
import { ReactNode } from 'react';

import RouteClosable, { RouteClosableComponentProps } from './RouteClosable';

export interface RouteSnackbarAlertProps {
  onClose?: () => void;
  children: ReactNode;
  slotProps?: {
    snackbar?: SnackbarProps;
    alert?: AlertProps;
  };
}

function RouteClosableSnackbarAlert({
  open,
  onClosing,
  onClosed,
  componentProps: props,
}: RouteClosableComponentProps<RouteSnackbarAlertProps>) {
  function handleExited() {
    onClosed();
    props.onClose?.();
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={10000}
      TransitionProps={{
        onExited: handleExited,
      }}
      onClose={onClosing}
      {...props.slotProps?.snackbar}
    >
      <Alert severity="error" onClose={onClosing} {...props.slotProps?.alert}>
        {props.children}
      </Alert>
    </Snackbar>
  );
}

export default function RouteSnackbarAlert(props: Omit<RouteSnackbarAlertProps, 'open'>) {
  return <RouteClosable Component={RouteClosableSnackbarAlert} ComponentProps={props} />;
}
