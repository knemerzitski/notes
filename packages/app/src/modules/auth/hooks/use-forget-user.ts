import { useCallback } from 'react';

import { useCustomApolloClient } from '../../apollo-client/context/custom-apollo-client-provider';
import { removeUser } from '../user';

export function useForgetUser() {
  const customApolloClient = useCustomApolloClient();

  return useCallback(
    (userId: string) => {
      removeUser(customApolloClient.cache, userId);
      customApolloClient.evictUserSpecific(userId, {
        cache: customApolloClient.cache,
      });
      customApolloClient.gc();
    },
    [customApolloClient]
  );
}
