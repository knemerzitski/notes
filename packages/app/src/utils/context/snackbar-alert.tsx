import {
  Alert,
  AlertProps,
  Fab,
  SnackbarCloseReason,
  SnackbarProps,
} from '@mui/material';

import { createContext, ReactNode, SyntheticEvent, useCallback, useContext } from 'react';

import { FabAdjustedSnackbar } from '../components/FabAdjustedSnackbar';

import { useGlobalIsPositive } from './global-count';
import { useIsOpen } from './is-open';
import { useOnClose } from './on-close';
import { useOnExited } from './on-exited';
import { CloseHandler, ShowModalOptions, useShowModal } from './serial-modals';



interface ShowSnackbarAlertContextProps extends SnackbarAlertProps {
  modalOptions?: ShowModalOptions;
}

type ShowSnackbarAlertClosure = (props: ShowSnackbarAlertContextProps) => CloseHandler;

const ShowSnackbarAlertContext = createContext<ShowSnackbarAlertClosure | null>(null);

export function useShowSnackbarAlert() {
  const ctx = useContext(ShowSnackbarAlertContext);
  if (ctx === null) {
    throw new Error('useShowSnackbarAlert() requires context <SnackbarAlertProvider>');
  }
  return ctx;
}

export function SnackbarAlertProvider({ children }: { children: ReactNode }) {
  const showModal = useShowModal();

  const showSnackbarAlert: ShowSnackbarAlertClosure = useCallback(
    ({ modalOptions, ...snackbarAlertProps }) =>
      showModal(
        <SnackbarAlert key={modalOptions?.key} {...snackbarAlertProps} />,
        modalOptions
      ),
    [showModal]
  );

  return (
    <ShowSnackbarAlertContext.Provider value={showSnackbarAlert}>
      {children}
    </ShowSnackbarAlertContext.Provider>
  );
}

interface SnackbarAlertProps {
  SnackbarProps?: Omit<SnackbarProps, 'open' | 'onClose' | 'TransitionProps'> & {
    TransitionProps?: Omit<SnackbarProps['TransitionProps'], 'onExited'>;
  };
  AlertProps?: Omit<AlertProps, 'onMouseDown' | 'onClose'>;
  /**
   *
   * @param reason
   * @returns Allow snackbar to close
   */
  onClose?: (reason?: SnackbarCloseReason) => boolean;
}

function SnackbarAlert({
  SnackbarProps,
  AlertProps,
  onClose: propsOnClose,
}: SnackbarAlertProps) {
  const open = useIsOpen();
  const onClose = useOnClose();
  const onExited = useOnExited();
  const isRenderingFab = useGlobalIsPositive(Fab);

  function handleClose(
    _event: SyntheticEvent<unknown> | Event,
    reason?: SnackbarCloseReason
  ) {
    const canClose = propsOnClose?.(reason) ?? true;
    if (canClose) {
      onClose();
    }
  }

  function handleExited() {
    onExited();
  }

  const handleAlertMouseDown: AlertProps['onMouseDown'] = (e) => {
    e.stopPropagation();
  };

  return (
    <FabAdjustedSnackbar
      {...SnackbarProps}
      isRenderingFab={isRenderingFab}
      open={open}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
    >
      <Alert {...AlertProps} onMouseDown={handleAlertMouseDown} onClose={handleClose} />
    </FabAdjustedSnackbar>
  );
}
