import { useSuspenseQuery } from '@apollo/client';
import { Divider } from '@mui/material';

import { gql } from '../../../__generated__/gql';

import { CurrentUserInfo } from './current-user-info';
import { LoginList } from './login-list';
import { SignOutAllUsersButton } from './signout-all-users-button';
import { UsersList } from './users-list';

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

export function UsersContainer() {
  const {
    data: { signedInUsers, currentSignedInUser },
  } = useSuspenseQuery(QUERY);

  return (
    <>
      <CurrentUserInfo />

      <Divider sx={{ mt: 3 }} />

      <UsersList users={signedInUsers} selectedUser={currentSignedInUser ?? undefined} />

      <LoginList
        sx={{
          mt: 3,
        }}
      />
      <SignOutAllUsersButton />
    </>
  );
}
