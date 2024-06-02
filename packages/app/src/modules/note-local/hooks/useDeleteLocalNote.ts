import { useCallback } from 'react';
import { useCustomApolloClient } from '../../apollo-client/context/CustomApolloClientProvider';

export default function useDeleteLocalNote() {
  const customApolloClient = useCustomApolloClient();

  return useCallback(
    (deleteLocalNoteId: string) => {
      const cache = customApolloClient.cache;

      customApolloClient.evict({
        id: cache.identify({
          id: deleteLocalNoteId,
          __typename: 'LocalNote',
        }),
      });
      customApolloClient.gc();
    },
    [customApolloClient]
  );
}
