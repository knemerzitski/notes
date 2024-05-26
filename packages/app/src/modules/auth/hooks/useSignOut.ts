import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import useNavigateSwitchCurrentUser from './useNavigateSwitchCurrentUser';
import { gql } from '../../../__generated__/gql';
import { removeUser } from '../state/user';

const SIGN_OUT = gql(`
  mutation UseSignOut($input: SignOutInput) {
    signOut(input: $input) {
      signedOut
    }
  }
`);

export default function useSignOut() {
  // const apolloClient = useApolloClient();
  const [signOut] = useMutation(SIGN_OUT);
  const navigateSwitchCurrentUser = useNavigateSwitchCurrentUser();

  return useCallback(
    /**
     * @param userId User to sign out.
     * If {@link userId} is not specified, then client will be signed out of all accounts
     */
    async (userId?: string) => {
      const { data } = await signOut({
        variables: {
          input: {
            userId: userId ?? null,
            allUsers: !userId,
          },
        },
        optimisticResponse: {
          signOut: {
            signedOut: true,
          },
        },
        update(cache) {
          removeUser(cache, userId);
        },
      });
      if (!data) return false;

      await navigateSwitchCurrentUser(true);

      return true;
    },
    [signOut, navigateSwitchCurrentUser]
  );
}
