import { useApolloClient, useQuery } from '@apollo/client';
import LogoutIcon from '@mui/icons-material/Logout';

import { Button, css, styled } from '@mui/material';

import { gql } from '../../__generated__';
import { hasUserOngoingOperations } from '../../graphql/link/persist/has-user';
import { useFetchedRoutes } from '../../utils/context/fetched-routes';
import { useOnClose } from '../../utils/context/on-close';
import { useShowConfirm } from '../../utils/context/show-confirm';
import { useSignOutMutation } from '../hooks/useSignOutMutation';
import { confirmUnsavedChanges } from '../utils/confirm-unsaved-changes';

const SignOutAllUsersButton_Query = gql(`
  query SignOutAllUsersButton_Query {
    signedInUsers(localOnly: false) @client {
      id
    }
  }
`);

export function SignOutAllUsersButton() {
  const client = useApolloClient();
  const closeParent = useOnClose();
  const signOut = useSignOutMutation();
  const showConfirm = useShowConfirm();
  const fetchedRoutes = useFetchedRoutes();

  const { data } = useQuery(SignOutAllUsersButton_Query);
  if (!data) return null;

  if (data.signedInUsers.length === 0) return null;

  function handleSignOut() {
    confirmUnsavedChanges({
      title: 'Sign out all users?',
      condition: hasUserOngoingOperations(null, client.cache),
      onSuccess: () => {
        closeParent();

        void signOut().finally(() => {
          fetchedRoutes.clearAll();
        });
      },
      showConfirm,
    });
  }

  return (
    <ButtonStyled
      color="inherit"
      variant="text"
      onClick={handleSignOut}
      aria-label="sign out all accounts"
    >
      <LogoutIcon />
      Sign out all accounts
    </ButtonStyled>
  );
}

const ButtonStyled = styled(Button)(css`
  line-height: 0px;
`);
