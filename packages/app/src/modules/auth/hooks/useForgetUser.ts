import { useCallback } from 'react';
import { removeUser } from '../user';
import { useCustomApolloClient } from '../../apollo-client/context/CustomApolloClientProvider';

export default function useForgetUser() {
  const customApolloClient = useCustomApolloClient();

  return useCallback(
    (userId: string) => {
      removeUser(customApolloClient.cache, userId);
      customApolloClient.evictUserSpecific(userId, {
        cache: customApolloClient.cache,
      });
      customApolloClient.cache.gc();
    },
    [customApolloClient]
  );
}
