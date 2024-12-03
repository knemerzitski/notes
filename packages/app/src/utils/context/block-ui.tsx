import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  styled,
} from '@mui/material';
import { createContext, ReactNode, useCallback, useContext, useId } from 'react';

import { BlockUiBackdrop } from '../components/BlockUiBackdrop';

import { useSmoothOpen } from '../hooks/useSmoothOpen';

import { useIsOpen } from './is-open';
import { useOnClose } from './on-close';
import { useOnExited } from './on-exited';

import { useShowModal } from './serial-modals';

interface BlockUiOptions {
  /**
   * Message to display. Reason for UI being blocked.
   */
  message: string;
  /**
   * Handler when user cancels the block. If not defined
   * then block cannot be cancelled.
   */
  onCancel?: () => void;
}

type UnblockUiClosure = () => void;
type BlockUiClosure = (options: BlockUiOptions) => UnblockUiClosure;

const BlockUiContext = createContext<BlockUiClosure | null>(null);

export function useBlockUi(): BlockUiClosure {
  const ctx = useContext(BlockUiContext);
  if (ctx === null) {
    throw new Error('useBlockUi() requires context <BlockUiProvider>');
  }
  return ctx;
}

export function BlockUiProvider({ children }: { children: ReactNode }) {
  const id = useId();
  const showModal = useShowModal();

  const blockUi: BlockUiClosure = useCallback(
    (options) =>
      showModal(<UncloseableContextDialog options={options} />, {
        immediate: true,
        uninterruptible: true,
        key: `${id}-block_ui`,
      }),
    [showModal, id]
  );

  return <BlockUiContext.Provider value={blockUi}>{children}</BlockUiContext.Provider>;
}

function UncloseableContextDialog({ options }: { options: BlockUiOptions }) {
  const onClose = useOnClose();
  const onExited = useOnExited();

  function handleExited() {
    onExited();
    reset();
  }

  const { open, delayStatus, reset } = useSmoothOpen(useIsOpen(), handleExited);

  function handleClose() {
    options.onCancel?.();
    onClose();
  }

  if (delayStatus === 'in_progress') {
    return <BlockUiBackdrop />;
  }

  return (
    <Dialog
      open={open}
      TransitionProps={{
        onExited: handleExited,
      }}
    >
      <DialogTitle>{options.message}</DialogTitle>
      <DialogContentStyled>
        <CircularProgress />
      </DialogContentStyled>
      {options.onCancel && (
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

export const DialogContentStyled = styled(DialogContent)(`
  text-align: center;
  align-items: center;
  justify-items: center;
`);
