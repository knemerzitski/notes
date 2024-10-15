import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogProps,
  DialogTitle,
} from '@mui/material';

import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';
import { useUserId } from '../context/user-id';
import { SignInProvidersList } from './SignInProvidersList';
import { Break } from '../../utils/components/Break';

const SignInModal_Query = gql(`
  query SignInModal_Query($id: ID) {
    signedInUserById(id: $id) @client {
      id
      public {
        profile {
          displayName
        }
      }
      sessionExpired
    }
  }
`);

export function SignInModal({
  open,
  onClose,
  DialogProps,
}: {
  open: boolean;
  onClose?: () => void;
  DialogProps?: Omit<DialogProps, 'open' | 'onClose'>;
}) {
  const userId = useUserId(true);
  const { data } = useQuery(SignInModal_Query, {
    variables: {
      id: userId,
    },
  });

  const user = data?.signedInUserById;

  function handleClose() {
    onClose?.();
  }

  return (
    <Dialog open={open} onClose={handleClose} {...DialogProps}>
      <DialogTitle>Sign In</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {user?.public.profile.displayName}
          {user?.sessionExpired && (
            <>
              <Break />
              Session has expired. Sign in to continue.
            </>
          )}
        </DialogContentText>
        <SignInProvidersList onSuccess={handleClose} onError={handleClose} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
