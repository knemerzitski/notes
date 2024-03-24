import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../__generated__/gql';
import { ClientSession } from '../../__generated__/graphql';
import { useSnackbarError } from '../../components/feedback/SnackbarAlertProvider';
import { currentSessionVar } from '../state/state';
import useSessionMutations from '../state/useSessionMutations';

import useNavigateToSession from './useNavigateToSession';

const SIGN_OUT = gql(`
  mutation UseSignOut($input: SignOutInput) {
    signOut(input: $input) {
      signedOut
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
            userId: session ? String(session.id) : null,
            allUsers: !session,
          },
        },
      });
      if (!data) return false;

      const { signedOut } = data.signOut;

      if (!signedOut) {
        showError('Failed to sign out');
        return false;
      }

      if (session) {
        deleteLocalSession(String(session.id));
        // TODO fetch current session from cache?
        await navigateToSession(currentSessionVar()?.id ?? null);
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
