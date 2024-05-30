import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { removeUser } from '../user';

export default function useForgetUser() {
  const apolloClient = useApolloClient();

  return useCallback(
    (userId: string) => {
      removeUser(apolloClient.cache, userId);
    },
    [apolloClient]
  );
}
