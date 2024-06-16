import { useApolloClient, useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../../__generated__/gql';
import { AuthProvider } from '../../../__generated__/graphql';
import { useSnackbarError } from '../../common/components/SnackbarAlertProvider';
import { addSignedInUser } from '../user';

import useNavigateSwitchCurrentUser from './useNavigateSwitchCurrentUser';

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

const QUERY_USER = gql(`
  query UseSignInWithGoogleSaveUser {
    user @client {
      id
      email
      isSessionExpired
      authProviderEntries {
        provider
        id
      }
    }
  }
`);

export default function useSignInWithGoogle() {
  const apolloClient = useApolloClient();
  const [signIn] = useMutation(SIGN_IN);
  const navigateSwitchCurrentUser = useNavigateSwitchCurrentUser();

  const showError = useSnackbarError();

  const startSignIn = useCallback(
    async (response: google.accounts.id.CredentialResponse) => {
      return await navigateSwitchCurrentUser(async ({ switchAfterClosure }) => {
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
          user: { id: userId },
          authProviderUser: { id: googleId, email },
        } = data.signIn;

        apolloClient.writeQuery({
          query: QUERY_USER,
          data: {
            user: {
              __typename: 'User',
              id: userId,
              email,
              isSessionExpired: false,
              authProviderEntries: [
                {
                  provider: AuthProvider.Google,
                  id: String(googleId),
                },
              ],
            },
          },
        });
        addSignedInUser(apolloClient.cache, String(userId));

        switchAfterClosure(String(userId));

        return true;
      });
    },
    [signIn, navigateSwitchCurrentUser, showError, apolloClient]
  );

  return startSignIn;
}
