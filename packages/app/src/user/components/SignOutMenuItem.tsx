import { useApolloClient, useQuery } from '@apollo/client';
import { MenuItem } from '@mui/material';
import { useUserId } from '../context/user-id';
import { useSignOutMutation } from '../hooks/useSignOutMutation';
import { gql } from '../../__generated__';
import { useOnClose } from '../../utils/context/on-close';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { hasUserOngoingOperations } from '../../graphql/link/persist/has-user';
import { useShowConfirm } from '../../utils/context/show-confirm';
import { confirmUnsavedChanges } from '../utils/confirm-unsaved-changes';
import { useFetchedRoutes } from '../../utils/context/fetched-routes';

const SignOutMenuItem_Query = gql(`
  query SignOutMenuItem_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      public {
        id
        profile {
          displayName
        }
      }
      local {
        id
        sessionExpired
      }
      localOnly
    }
  }
`);

export function SignOutMenuItem() {
  const client = useApolloClient();
  const isOnline = useIsOnline();
  const signOutMutation = useSignOutMutation();
  const closeMenu = useOnClose();
  const showConfirm = useShowConfirm();
  const fetchedRoutes = useFetchedRoutes();

  const userId = useUserId();
  const { data } = useQuery(SignOutMenuItem_Query, {
    variables: {
      id: userId,
    },
  });

  const _user = data?.signedInUser;
  if (!_user) return null;
  const user = _user;

  if (!isOnline || user.local.sessionExpired || user.localOnly) return null;

  function handleSignOut() {
    closeMenu();

    confirmUnsavedChanges({
      title: `Sign out "${user.public.profile.displayName}"?`,
      condition: hasUserOngoingOperations([userId], client.cache),
      onSuccess: () => {
        void signOutMutation(userId).finally(() => {
          fetchedRoutes.clear(userId);
        });
      },
      showConfirm,
    });
  }

  return <MenuItem onClick={handleSignOut}>Sign out</MenuItem>;
}