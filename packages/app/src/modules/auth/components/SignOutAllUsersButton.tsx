import { useSuspenseQuery } from '@apollo/client';
import LogoutIcon from '@mui/icons-material/Logout';
import { Button } from '@mui/material';

import { gql } from '../../../__generated__/gql';
import { useCloseable } from '../context/CloseableProvider';
import useSignOut from '../hooks/useSignOut';

const QUERY = gql(`
  query SignOutAllUsersButton {
    currentSignedInUser @client {
      id
    }
  }
`);

export default function SignOutAllUsersButton() {
  const close = useCloseable();

  const {
    data: { currentSignedInUser },
  } = useSuspenseQuery(QUERY);

  const signOut = useSignOut();

  async function handleClickSignOut() {
    if (await signOut()) {
      close();
    }
  }

  if (!currentSignedInUser) return null;

  return (
    <Button
      color="inherit"
      variant="text"
      onClick={() => {
        void handleClickSignOut();
      }}
      sx={{
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        px: 2,
        py: 1,
      }}
    >
      <LogoutIcon />
      Sign out of all accounts
    </Button>
  );
}
