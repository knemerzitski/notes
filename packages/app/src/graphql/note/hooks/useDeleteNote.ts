import { useMutation } from '@apollo/client';

import { gql } from '../../../local-state/__generated__/gql';

const MUTATION = gql(`
  mutation UseDeleteNote($input: DeleteNoteInput!) {
    deleteUserNote(input: $input) {
      deleted
    }
  }
`);

export default function useDeleteNote(): (id: string) => Promise<boolean> {
  const [deleteNote] = useMutation(MUTATION);

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

        cache.evict({ id: cache.identify({ id, __typename: 'UserNote' }) });
        cache.gc();
      },
    });

    return result.data?.deleteUserNote.deleted ?? false;
  };
}
