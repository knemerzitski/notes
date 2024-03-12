import { useSuspenseQuery } from '@apollo/client';
import { Divider } from '@mui/material';

import { gql } from '../../__generated__/gql';

import CurrentSessionInfo from './CurrentSessionInfo';
import LoginList from './LoginList';
import SignOutOfAllSessionsButton from './SignOutOfAllSessionsButton';
import SessionList from './list/SessionList';

const QUERY = gql(`
  query SessionsManager {
    clientSessions @client {
      key
      displayName
      email
      isExpired
      authProviderId
    }

    currentClientSession @client {
      key
    }
  }
`);

export default function SessionsManager() {
  const {
    data: { clientSessions, currentClientSession },
  } = useSuspenseQuery(QUERY);

  return (
    <>
      <CurrentSessionInfo />

      <Divider sx={{ mt: 3 }} />

      <SessionList
        sessions={clientSessions}
        selectedSession={currentClientSession ?? undefined}
      />

      <LoginList
        sx={{
          mt: 3,
        }}
      />
      <SignOutOfAllSessionsButton />
    </>
  );
}
