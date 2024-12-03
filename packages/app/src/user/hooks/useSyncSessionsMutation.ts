import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { useMutation } from '../../graphql/hooks/useMutation';
import {
  SyncSessionCookies,
  syncSessionCookiesVariables,
} from '../mutations/SyncSessionCookies';

export function useSyncSessionCookiesMutation() {
  const client = useApolloClient();

  const [syncSessionCookiesMutation] = useMutation(SyncSessionCookies);

  return useCallback(async () => {
    return syncSessionCookiesMutation({
      variables: syncSessionCookiesVariables(client.cache),
    });
  }, [syncSessionCookiesMutation, client]);
}
