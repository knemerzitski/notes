import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import useSessionMutations from '../state/useSessionMutations';

import useNavigateToSession from './useNavigateToSession';
import { gql } from '../../../__generated__/gql';
import { AuthProvider } from '../../../__generated__/graphql';
import { useSnackbarError } from '../../common/components/SnackbarAlertProvider';

const SIGN_IN = gql(`
  mutation UseSignInWithGoogle($input: SignInInput!)  {
    signIn(input: $input) {
      user {
        id
        profile {
          displayName
        }
      }
      authProviderUser {
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
        user: {
          id: userId,
          profile: { displayName },
        },
        authProviderUser: { id: googleId, email },
      } = data.signIn;

      updateSession({
        id: userId,
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

      await navigateToSession(String(userId));

      return true;
    },
    [signIn, navigateToSession, updateSession, showError]
  );

  return startSignIn;
}
