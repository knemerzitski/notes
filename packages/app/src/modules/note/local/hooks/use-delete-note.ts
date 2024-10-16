import { useCallback } from 'react';

import { useCustomApolloClient } from '../../../apollo-client/context/custom-apollo-client-provider';

export function useDeleteNote() {
  const customApolloClient = useCustomApolloClient();

  return useCallback(
    (deleteNoteId: string) => {
      const cache = customApolloClient.cache;

      customApolloClient.evict({
        id: cache.identify({
          id: deleteNoteId,
          __typename: 'LocalNote',
        }),
      });
      customApolloClient.gc();
    },
    [customApolloClient]
  );
}
