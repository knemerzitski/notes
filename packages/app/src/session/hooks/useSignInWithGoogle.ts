import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../__generated__/gql';
import { AuthProvider } from '../../__generated__/graphql';
import { useSnackbarError } from '../../components/feedback/SnackbarAlertProvider';
import useSessionMutations from '../state/useSessionMutations';

import useNavigateToSession from './useNavigateToSession';

const SIGN_IN = gql(`
  mutation UseSignInWithGoogle($input: SignInInput!)  {
    signIn(input: $input) {
      currentSessionId
      userInfo {
        profile {
          displayName
        }
      }
      authProviderUserInfo {
        id
        email
      }
    }
  }
`);

export default function useSignInWithGoogle() {
  const [signIn] = useMutation(SIGN_IN);
  const { updateSession } = useSessionMutations();
  const navigateToSession = useNavigateToSession();

  const showError = useSnackbarError();

  const startSignIn = useCallback(
    async (response: google.accounts.id.CredentialResponse) => {
      const { data } = await signIn({
        variables: {
          input: {
            provider: AuthProvider.Google,
            credentials: {
              token: response.credential,
            },
          },
        },
      });
      if (!data) return false;

      if (!data.signIn) {
        showError('Failed to sign in');
        return false;
      }

      const {
        currentSessionId,
        userInfo: {
          profile: { displayName },
        },
        authProviderUserInfo: { id: googleId, email },
      } = data.signIn;

      updateSession({
        id: currentSessionId,
        isExpired: false,
        displayName,
        email,
        authProviderEntries: [
          {
            provider: AuthProvider.Google,
            id: String(googleId),
          },
        ],
      });

      await navigateToSession(currentSessionId);

      return true;
    },
    [signIn, navigateToSession, updateSession, showError]
  );

  return startSignIn;
}
