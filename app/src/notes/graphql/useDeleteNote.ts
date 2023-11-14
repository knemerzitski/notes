import { useMutation } from '@apollo/client';

import DELETE_NOTE from './DELETE_NOTE';

export default function useDeleteNote(): (id: string) => Promise<boolean> {
  const [deleteNote] = useMutation(DELETE_NOTE);

  return async (id) => {
    const result = await deleteNote({
      variables: {
        id,
      },
      optimisticResponse: {
        deleteNote: true,
      },
      update(cache, { data }) {
        if (!data?.deleteNote) return;

        cache.evict({ id: cache.identify({ id, __typename: 'Note' }) });
        cache.gc();
      },
    });

    return result.data?.deleteNote ?? false;
  };
}
