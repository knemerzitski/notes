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
      currentSessionKey
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
  const { updateSession: localUpdateSession } = useSessionMutations();
  const localSwitchToSession = useNavigateToSession();

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
        currentSessionKey,
        userInfo: {
          profile: { displayName },
        },
        authProviderUserInfo: { id: googleId, email },
      } = data.signIn;

      localUpdateSession({
        key: currentSessionKey,
        displayName,
        email,
        authProviderId: googleId,
        isExpired: false,
      });

      await localSwitchToSession(currentSessionKey);

      return true;
    },
    [signIn, localSwitchToSession, localUpdateSession, showError]
  );

  return startSignIn;
}
