import { gql, useQuery } from '@apollo/client';
import { MenuItem, MenuItemProps } from '@mui/material';
import { useUserId } from '../context/user-id';
import { useOpenSignInModal } from '../context/sign-in-modal';
import { useOnClose } from '../../utils/context/on-close';

const SignInMenuItem_Query = gql(`
  query SignInMenuItem_Query($id: ID!) {
    signedInUserById(id: $id) @client {
      sessionExpired
      localOnly
    }
  }
`);

export function SignInMenuItem(props: Omit<MenuItemProps, 'onClick'>) {
  const openSignInModal = useOpenSignInModal();
  const closeMenu = useOnClose();

  const userId = useUserId();
  const { data } = useQuery(SignInMenuItem_Query, {
    variables: {
      id: userId,
    },
  });

  const user = data?.signedInUserById;
  if (!user) return null;

  if (!user.sessionExpired || user.localOnly) return null;

  function handleSignIn() {
    closeMenu();
    openSignInModal(userId);
  }

  return (
    <MenuItem {...props} onClick={handleSignIn}>
      Sign in
    </MenuItem>
  );
}
