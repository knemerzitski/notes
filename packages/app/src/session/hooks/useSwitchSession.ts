import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../__generated__/gql';
import { SavedSession } from '../../__generated__/graphql';

import useNavigateToSession from './useNavigateToSession';

const SWITCH_SESSION = gql(`
  mutation UseSwitchSession($input: SwitchToSessionInput!) {
    switchToSession(input: $input) {
      currentSessionKey
    }
  }
`);

export default function useSwitchSession() {
  const [switchToSession] = useMutation(SWITCH_SESSION);
  const navigateToSession = useNavigateToSession();

  const startSwitchSession = useCallback(
    async (session: SavedSession) => {
      const { data } = await switchToSession({
        variables: {
          input: {
            switchToSessionKey: String(session.key),
          },
        },
      });
      if (!data) return false;

      const { currentSessionKey: sessionKey } = data.switchToSession;

      await navigateToSession(sessionKey);

      return true;
    },
    [switchToSession, navigateToSession]
  );

  return startSwitchSession;
}
