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
      currentSessionId
    }
  }
`);

export default function useSignOut() {
  const [signOut] = useMutation(SIGN_OUT);
  const { deleteSession: deleteLocalSession, clearSessions: clearLocalSessions } =
    useSessionMutations();
  const navigateToSession = useNavigateToSession();

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
            sessionId: session ? String(session.id) : null,
            allSessions: !session,
          },
        },
      });
      if (!data) return false;

      const { signedOut, currentSessionId: newSessionKey } = data.signOut;

      if (!signedOut) {
        showError('Failed to sign out');
        return false;
      }

      if (session) {
        deleteLocalSession(String(session.id));
        await navigateToSession(newSessionKey ?? null);
      } else {
        clearLocalSessions();
        await navigateToSession(null);
      }

      return true;
    },
    [signOut, deleteLocalSession, navigateToSession, showError, clearLocalSessions]
  );

  return startSignOut;
}
