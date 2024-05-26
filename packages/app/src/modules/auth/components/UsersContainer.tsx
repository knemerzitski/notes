import { useSuspenseQuery } from '@apollo/client';
import { Divider } from '@mui/material';

import CurrentUserInfo from './CurrentUserInfo';
import LoginList from './LoginList';
import SignOutAllUsersButton from './SignOutAllUsersButton';
import UsersList from './UsersList';
import { gql } from '../../../__generated__/gql';

const QUERY = gql(`
  query UsersContainer {
    signedInUsers @client {
      id
      isSessionExpired
      profile {
        displayName
      }
      email
      
      authProviderEntries {
        provider
        id
      }
    }

    currentSignedInUser @client {
      id
    }
  }
`);

export default function UsersContainer() {
  const {
    data: { signedInUsers, currentSignedInUser },
  } = useSuspenseQuery(QUERY);

  return (
    <>
      <CurrentUserInfo />

      <Divider sx={{ mt: 3 }} />

      <UsersList
        users={signedInUsers}
        selectedUser={currentSignedInUser ?? undefined}
      />

      <LoginList
        sx={{
          mt: 3,
        }}
      />
      <SignOutAllUsersButton />
    </>
  );
}
