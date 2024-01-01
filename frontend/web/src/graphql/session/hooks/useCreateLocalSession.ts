import { useMutation } from '@apollo/client';

import CREATE_LOCAL_SESSION from '../documents/CREATE_LOCAL_SESSION';
import GET_SESSIONS from '../documents/GET_SESSIONS';

export default function useCreateLocalSession(): (
  displayName: string
) => Promise<number | null> {
  const [createLocalSession] = useMutation(CREATE_LOCAL_SESSION);

  return async (displayName) => {
    const result = await createLocalSession({
      variables: {
        displayName,
      },
      optimisticResponse: {
        createLocalSession: -1,
      },
      update(cache, { data }) {
        if (!data?.createLocalSession) return;

        cache.updateQuery({ query: GET_SESSIONS }, (cacheData) => {
          if (!cacheData) return;

          return cacheData;
        });
      },
    });

    return result.data?.createLocalSession ?? null;
  };
}
