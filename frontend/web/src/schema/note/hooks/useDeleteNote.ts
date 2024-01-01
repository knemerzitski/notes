import { useMutation } from '@apollo/client';

import DELETE_NOTE from '../documents/DELETE_NOTE';

export default function useDeleteNote(): (id: string) => Promise<boolean> {
  const [deleteNote] = useMutation(DELETE_NOTE());

  return async (id) => {
    const result = await deleteNote({
      variables: {
        input: {
          id,
        },
      },
      optimisticResponse: {
        deleteUserNote: {
          deleted: true,
        },
      },
      update(cache, { data }) {
        if (!data?.deleteUserNote) return;

        //TODO clear from notes too?
        cache.evict({ id: cache.identify({ id, __typename: 'Note' }) });
        cache.gc();
      },
    });

    return result.data?.deleteUserNote.deleted ?? false;
  };
}
