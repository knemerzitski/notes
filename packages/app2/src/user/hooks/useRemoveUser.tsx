import { useCallback } from 'react';

import { useApolloClient } from '@apollo/client';
import { removeUsers } from '../utils/signed-in-user/remove';

export function useRemoveUser() {
  const client = useApolloClient();

  return useCallback(
    (userId: string) => {
      removeUsers([userId], client.cache);
    },
    [client]
  );
}
