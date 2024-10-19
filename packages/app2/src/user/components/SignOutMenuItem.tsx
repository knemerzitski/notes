import { useQuery } from '@apollo/client';
import { MenuItem } from '@mui/material';
import { useUserId } from '../context/user-id';
import { useSignOutMutation } from '../hooks/useSignOutMutation';
import { gql } from '../../__generated__';
import { useOnClose } from '../../utils/context/on-close';

const SignOutMenuItem_Query = gql(`
  query SignOutMenuItem_Query($id: ID!) {
    signedInUserById(id: $id) @client {
      local {
        sessionExpired
      }
      localOnly
    }
  }
`);

export function SignOutMenuItem() {
  const signOutMutation = useSignOutMutation();
  const closeMenu = useOnClose();

  const userId = useUserId();
  const { data } = useQuery(SignOutMenuItem_Query, {
    variables: {
      id: userId,
    },
  });

  const user = data?.signedInUserById;
  if (!user) return null;

  if (user.local.sessionExpired || user.localOnly) return null;

  function handleSignOut() {
    closeMenu();
    void signOutMutation(userId);
  }

  return <MenuItem onClick={handleSignOut}>Sign out</MenuItem>;
}
