import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { useMutation } from '../../graphql/hooks/useMutation';
import { useBlockUi } from '../../utils/context/block-ui';
import { setCurrentUser } from '../../user/models/signed-in-user/set-current';
import { SignIn } from '../../user/mutations/SignIn';

export function useSignInDemoMutation() {
  const client = useApolloClient();
  const blockUi = useBlockUi(true);

  const [signInMutation] = useMutation(SignIn);

  return useCallback(
    async (demoUserId: string) => {
      const controller = new AbortController();

      const unblock = blockUi?.({
        message: 'Signing in with Demo account',
        onCancel: () => {
          controller.abort(new Error('User aborted'));
        },
      });

      try {
        const result = await signInMutation({
          variables: {
            input: {
              auth: {
                demo: {
                  id: demoUserId,
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
        unblock?.();
      }
    },
    [signInMutation, client, blockUi]
  );
}
