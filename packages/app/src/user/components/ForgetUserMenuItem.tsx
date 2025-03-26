import { useApolloClient, useQuery } from '@apollo/client';
import { MenuItem } from '@mui/material';

import { gql } from '../../__generated__';
import { hasUserOngoingOperations } from '../../graphql/link/persist/has-user';
import { useOnClose } from '../../utils/context/on-close';
import { useShowConfirm } from '../../utils/context/show-confirm';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { useUserId } from '../context/user-id';
import { useRemoveUser } from '../hooks/useRemoveUser';
import { confirmUnsavedChanges } from '../utils/confirm-unsaved-changes';

const ForgetUserMenuItem_Query = gql(`
  query ForgetUserMenuItem_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      profile {
        displayName
      }
      local {
        id
        sessionExpired
      }
      localOnly
    }
  }
`);

export function ForgetUserMenuItem() {
  const client = useApolloClient();
  const isOnline = useIsOnline();
  const removeUser = useRemoveUser();
  const showConfirm = useShowConfirm();
  const closeMenu = useOnClose();

  const userId = useUserId();
  const { data } = useQuery(ForgetUserMenuItem_Query, {
    variables: {
      id: userId,
    },
    fetchPolicy: 'cache-only',
  });

  const _user = data?.signedInUser;
  if (!_user) return null;
  const user = _user;

  if (isOnline && (!user.local.sessionExpired || user.localOnly)) return null;

  function handleForgetUser() {
    closeMenu();

    confirmUnsavedChanges({
      title: `Forget "${user.profile.displayName}"?`,
      condition: hasUserOngoingOperations([userId], client.cache),
      onSuccess: () => {
        removeUser(userId);
      },
      showConfirm,
    });
  }

  return (
    <MenuItem aria-label="forget" onClick={handleForgetUser}>
      Forget
    </MenuItem>
  );
}
