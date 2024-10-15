import { MenuItem } from '@mui/material';
import { useUserId } from '../context/user-id';
import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';
import { useRemoveUser } from '../hooks/useRemoveUser';

const ForgetUserMenuItem_Query = gql(`
  query ForgetUserMenuItem_Query($id: ID!) {
    signedInUserById(id: $id) @client {
      sessionExpired
      localOnly
    }
  }
`);

export function ForgetUserMenuItem() {
  const removeUser = useRemoveUser();

  const userId = useUserId();
  const { data } = useQuery(ForgetUserMenuItem_Query, {
    variables: {
      id: userId,
    },
  });

  const user = data?.signedInUserById;
  if (!user) return null;

  if (!user.sessionExpired || user.localOnly) return null;

  function handleForgetUser() {
    removeUser(userId);
  }

  return <MenuItem onClick={handleForgetUser}>Forget</MenuItem>;
}
