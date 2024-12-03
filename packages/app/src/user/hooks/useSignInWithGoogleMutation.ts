import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { useMutation } from '../../graphql/hooks/useMutation';
import { useBlockUi } from '../../utils/context/block-ui';
import { setCurrentUser } from '../models/signed-in-user/set-current';
import { SignIn } from '../mutations/SignIn';

export function useSignInWithGoogleMutation() {
  const client = useApolloClient();
  const blockUi = useBlockUi();

  const [signInMutation] = useMutation(SignIn);

  return useCallback(
    async (response: google.accounts.id.CredentialResponse) => {
      const controller = new AbortController();

      const unblock = blockUi({
        message: 'Signing in with Google',
        onCancel: () => {
          controller.abort(new Error('User aborted'));
        },
      });

      try {
        const result = await signInMutation({
          variables: {
            input: {
              auth: {
                google: {
                  token: response.credential,
                },
              },
            },
          },
          context: {
            fetchOptions: {
              signal: controller.signal,
            },
          },
        });

        const data = result.data;

        if (!data) return false;

        const userId = data.signIn.signedInUser.id;

        setCurrentUser(userId, client.cache);

        return true;
      } finally {
        unblock();
      }
    },
    [signInMutation, client, blockUi]
  );
}
