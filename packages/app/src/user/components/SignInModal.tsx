import { useQuery } from '@apollo/client';
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
import { Break } from '../../utils/components/Break';
import { useUserId } from '../context/user-id';

import { SignInProvidersList } from './SignInProvidersList';

const SignInModal_Query = gql(`
  query SignInModal_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      profile {
        displayName
      }
      local {
        id
        sessionExpired
      }
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: userId!,
    },
    fetchPolicy: 'cache-only',
  });

  const user = data?.signedInUser;

  function handleClose() {
    onClose?.();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      {...DialogProps}
      PaperProps={{
        'aria-label': 'sign in modal',
        ...DialogProps?.PaperProps,
      }}
    >
      <DialogTitle>Sign In</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {user?.profile.displayName}
          {user?.local.sessionExpired && (
            <>
              <Break />
              Session has expired. Sign in to continue.
            </>
          )}
        </DialogContentText>
        <SignInProvidersList onSuccess={handleClose} onError={handleClose} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} aria-label="cancel">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
