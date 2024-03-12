import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../__generated__/gql';
import { ClientSession } from '../../__generated__/graphql';
import useSessionMutations from '../state/useSessionMutations';

import useNavigateToSession from './useNavigateToSession';

const SWITCH_SESSION = gql(`
  mutation UseSwitchSession($input: SwitchToSessionInput!) {
    switchToSession(input: $input) {
      currentSessionId
    }
  }
`);

export default function useSwitchSession() {
  const [switchToSession] = useMutation(SWITCH_SESSION);
  const navigateToSession = useNavigateToSession();

  const { updateSession } = useSessionMutations();

  const startSwitchSession = useCallback(
    async (session: Omit<ClientSession, 'authProviderEntries'>) => {
      const { data } = await switchToSession({
        variables: {
          input: {
            switchToSessionId: String(session.id),
          },
        },
      });
      if (!data?.switchToSession) return false;

      const { currentSessionId: sessionId } = data.switchToSession;
      if (sessionId !== session.id) {
        // Session has expired
        updateSession({
          ...session,
          isExpired: true,
        });
        return false;
      }

      await navigateToSession(sessionId);

      return true;
    },
    [switchToSession, navigateToSession, updateSession]
  );

  return startSwitchSession;
}
