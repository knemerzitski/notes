import { useQuery } from '@apollo/client';
import LogoutIcon from '@mui/icons-material/Logout';
import { useSignOutMutation } from '../hooks/useSignOutMutation';
import { gql } from '../../__generated__';
import { useOnClose } from '../../utils/context/on-close';
import { CenterButton } from '../../utils/styled-components/CenterButton';

// TODO confirm dialog before sign out?

const SignOutAllUsersButton_Query = gql(`
  query SignOutAllUsersButton_Query {
    signedInUsers(localOnly: false) @client {
      id
    }
  }
`);

export function SignOutAllUsersButton() {
  const closeParent = useOnClose();
  const signOut = useSignOutMutation();

  const { data } = useQuery(SignOutAllUsersButton_Query);
  if (!data) return null;

  if (data.signedInUsers.length === 0) return null;

  function handleSignOut() {
    closeParent();
    void signOut();
  }

  return (
    <CenterButton
      color="inherit"
      variant="text"
      onClick={handleSignOut}
      aria-label="sign out all accounts"
    >
      <LogoutIcon />
      Sign out all accounts
    </CenterButton>
  );
}
