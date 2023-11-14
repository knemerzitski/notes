import { useMutation } from '@apollo/client';

import { LocalSession } from '../../__generated__/graphql';

import GET_SESSIONS from './GET_SESSIONS';
import INSERT_LOCAL_SESSION from './INSERT_LOCAL_SESSION';

export default function useInsertLocalSession(): (
  displayName: string
) => Promise<LocalSession | null> {
  const [insertLocalUser] = useMutation(INSERT_LOCAL_SESSION);

  return async (displayName) => {
    const result = await insertLocalUser({
      variables: {
        displayName,
      },
      optimisticResponse: {
        insertLocalSession: {
          id: 'Session',
          displayName,
        },
      },
      update(cache, { data }) {
        if (!data?.insertLocalSession) return;

        cache.updateQuery({ query: GET_SESSIONS }, (cacheData) => {
          if (!cacheData) return;

          return cacheData;
        });
      },
    });

    return result.data?.insertLocalSession ?? null;
  };
}
