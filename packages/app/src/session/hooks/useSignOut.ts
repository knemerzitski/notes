import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../__generated__/gql';
import { ClientSession } from '../../__generated__/graphql';
import { useSnackbarError } from '../../components/feedback/SnackbarAlertProvider';
import useSessionMutations from '../state/useSessionMutations';

import useNavigateToSession from './useNavigateToSession';

const SIGN_OUT = gql(`
  mutation UseSignOut($input: SignOutInput) {
    signOut(input: $input) {
      signedOut
      currentSessionKey
    }
  }
`);

export default function useSignOut() {
  const [signOut] = useMutation(SIGN_OUT);
  const { deleteSession: deleteLocalSession, clearSessions: clearLocalSessions } =
    useSessionMutations();
  const localSwitchToSession = useNavigateToSession();

  const showError = useSnackbarError();

  const startSignOut = useCallback(
    /**
     * @param session Account session to sign out from.
     * If session is not specified, then user will be signed out of all accounts
     */
    async (session?: ClientSession) => {
      const { data } = await signOut({
        variables: {
          input: {
            sessionKey: session ? String(session.key) : null,
            allSessions: !session,
          },
        },
      });
      if (!data) return false;

      const { signedOut, currentSessionKey: newSessionKey } = data.signOut;

      if (!signedOut) {
        showError('Failed to sign out');
        return false;
      }

      if (session) {
        deleteLocalSession(String(session.key));
        await localSwitchToSession(newSessionKey ?? null);
      } else {
        clearLocalSessions();
        await localSwitchToSession(null);
      }

      return true;
    },
    [signOut, deleteLocalSession, localSwitchToSession, showError, clearLocalSessions]
  );

  return startSignOut;
}
