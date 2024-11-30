import { ReactNode } from '@tanstack/react-router';
import { useCallback, useId, useRef } from 'react';
import { useShowModal } from '../context/serial-modals';
import { ShowConfirmClosure, ShowConfirmProvider } from '../context/show-confirm';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { useIsOpen } from '../context/is-open';
import { useOnClose } from '../context/on-close';
import { useOnExited } from '../context/on-exited';

export function ShowConfirmDialogProvider({ children }: { children: ReactNode }) {
  const id = useId();
  const showModal = useShowModal();

  const onConfirm: ShowConfirmClosure = useCallback(
    (message, options) => {
      const key = `${id}:${message}`;
      showModal(
        <ConfirmModal
          key={key}
          title={options?.title}
          message={message}
          onSuccess={options?.onSuccess}
          onCancel={options?.onCancel}
        />,
        {
          immediate: true,
          uninterruptible: true,
          maxShowCount: 1,
          key,
          onDuplicate() {
            options?.onCancel?.();
          },
        }
      );

      return;
    },
    [showModal, id]
  );

  return <ShowConfirmProvider onConfirm={onConfirm}> {children}</ShowConfirmProvider>;
}

function ConfirmModal({
  title: _title,
  message: _message,
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
  message: string;
}) {
  const open = useIsOpen();
  const onClose = useOnClose();
  const onExited = useOnExited();
  const isDoneRef = useRef<boolean>(false);

  function handleClose() {
    onClose();
    if (!isDoneRef.current) {
      isDoneRef.current = true;
      onCancel?.();
    }
  }

  function handleExited() {
    onExited();
  }

  function handleOk() {
    if (!isDoneRef.current) {
      isDoneRef.current = true;
      onSuccess?.();
    }
    onClose();
  }

  const title = _title ?? _message;
  const message = _title && _message ? _message : undefined;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
    >
      <DialogTitle>{title}</DialogTitle>
      {message && (
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleOk}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
