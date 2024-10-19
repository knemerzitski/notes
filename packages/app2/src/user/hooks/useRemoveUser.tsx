import { useCallback } from 'react';

import { useApolloClient } from '@apollo/client';
import { removeUsers } from '../models/signed-in-user/remove';

export function useRemoveUser() {
  const client = useApolloClient();

  return useCallback(
    (userId: string) => {
      removeUsers([userId], client.cache, client.defaultContext.taggedEvict);
    },
    [client]
  );
}
