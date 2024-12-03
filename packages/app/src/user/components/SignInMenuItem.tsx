import { useQuery } from '@apollo/client';
import { MenuItem, MenuItemProps } from '@mui/material';

import { gql } from '../../__generated__';
import { useOnClose } from '../../utils/context/on-close';
import { useOpenSignInModal } from '../context/sign-in-modal';
import { useUserId } from '../context/user-id';

const SignInMenuItem_Query = gql(`
  query SignInMenuItem_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      local {
        id
        sessionExpired
        __typename
      }
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

  const user = data?.signedInUser;
  if (!user) return null;

  if (!user.local.sessionExpired || user.localOnly) return null;

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
