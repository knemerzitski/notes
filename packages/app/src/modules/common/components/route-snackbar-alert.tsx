import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';
import { ReactNode } from 'react';

import { RouteClosableComponentProps, RouteClosable } from './route-closable';

export interface RouteSnackbarAlertProps {
  onClose?: () => void;
  children: ReactNode;
  snackBarProps?: SnackbarProps;
  alertProps?: AlertProps;
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
      {...props.snackBarProps}
    >
      <Alert severity="error" onClose={onClosing} {...props.alertProps}>
        {props.children}
      </Alert>
    </Snackbar>
  );
}

export function RouteSnackbarAlert(props: Omit<RouteSnackbarAlertProps, 'open'>) {
  return <RouteClosable Component={RouteClosableSnackbarAlert} ComponentProps={props} />;
}
