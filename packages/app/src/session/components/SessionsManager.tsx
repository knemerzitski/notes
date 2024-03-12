import { useSuspenseQuery } from '@apollo/client';
import { Divider } from '@mui/material';

import { gql } from '../../__generated__/gql';

import CurrentSessionInfo from './CurrentSessionInfo';
import LoginList from './LoginList';
import SignOutOfAllSessionsButton from './SignOutOfAllSessionsButton';
import SessionList from './list/SessionList';

const QUERY = gql(`
  query SessionsManager {
    savedSessions @client {
      key
      displayName
      email
      isExpired
      authProviderId
    }

    currentSavedSession @client {
      key
    }
  }
`);

export default function SessionsManager() {
  const {
    data: { savedSessions, currentSavedSession },
  } = useSuspenseQuery(QUERY);

  return (
    <>
      <CurrentSessionInfo />

      <Divider sx={{ mt: 3 }} />

      <SessionList sessions={savedSessions} selectedSession={currentSavedSession} />

      <LoginList
        sx={{
          mt: 3,
        }}
      />
      <SignOutOfAllSessionsButton />
    </>
  );
}
