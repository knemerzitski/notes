import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { SignedInUser } from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { getUserIds } from '../models/signed-in-user/get-ids';
import { SignOut } from '../mutations/SignOut';

export function useSignOutMutation() {
  const client = useApolloClient();
  const [signOutMutation] = useMutation(SignOut);

  return useCallback(
    (userId?: SignedInUser['id']) => {
      return signOutMutation({
        variables: {
          input: userId ? { userId } : { allUsers: true },
        },
        optimisticResponse: {
          __typename: 'Mutation',
          signOut: {
            __typename: 'SignOutPayload',
            signedOutUserIds: userId ? [userId] : getUserIds(client.cache),
          },
        },
      });
    },
    [signOutMutation, client]
  );
}
