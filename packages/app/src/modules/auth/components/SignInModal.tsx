import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogProps,
  DialogTitle,
} from '@mui/material';

import { ClientSession } from '../../__generated__/graphql';

import LoginList from './LoginList';

type SignInResult = 'success' | 'error' | 'canceled';

export interface SignInModalProps {
  /**
   * Hint which session is being logged into.
   */
  sessionHint?: ClientSession;
  open: boolean;
  onClose?: (result: SignInResult) => void;
  dialogProps?: Omit<DialogProps, 'open' | 'onClose'>;
}

export default function SignInModal({
  sessionHint,
  open,
  onClose,
  dialogProps,
}: SignInModalProps) {
  return (
    <>
      <Dialog open={open} onClose={() => onClose?.('canceled')} {...dialogProps}>
        <DialogTitle>Sign In</DialogTitle>
        <DialogContent>
          {sessionHint?.isExpired && (
            <DialogContentText>
              <i>{sessionHint.email}</i>
              <br />
              Session has expired. Sign in to continue.
            </DialogContentText>
          )}
          <LoginList
            onSuccess={() => onClose?.('success')}
            onError={() => onClose?.('error')}
            sessionHint={sessionHint}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose?.('canceled')}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
