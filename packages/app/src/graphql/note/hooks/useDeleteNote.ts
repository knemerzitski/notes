import { useMutation } from '@apollo/client';

import { gql } from '../../../__generated__/gql';

const MUTATION = gql(`
  mutation UseDeleteNote($input: DeleteNoteInput!) {
    deleteNote(input: $input) {
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
        deleteNote: {
          deleted: true,
        },
      },
      update(cache, { data }) {
        if (!data?.deleteNote) return;

        cache.evict({ id: cache.identify({ id, __typename: 'UserNote' }) });
        cache.gc();
      },
    });

    return result.data?.deleteNote.deleted ?? false;
  };
}
