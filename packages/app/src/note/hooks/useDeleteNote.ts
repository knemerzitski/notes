import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../__generated__/gql';

const MUTATION = gql(`
  mutation UseDeleteNote($input: DeleteNoteInput!) {
    deleteNote(input: $input) {
      deleted
    }
  }
`);

export default function useDeleteNote() {
  const [deleteNote] = useMutation(MUTATION);

  return useCallback(
    async (id: string) => {
      const result = await deleteNote({
        variables: {
          input: {
            contentId: id,
          },
        },
        optimisticResponse: {
          deleteNote: {
            deleted: true,
          },
        },
        update(cache, { data }) {
          if (!data?.deleteNote.deleted) return;

          cache.evict({ id: cache.identify({ id, __typename: 'Note' }) });
          cache.gc();
        },
      });

      return result.data?.deleteNote.deleted ?? false;
    },
    [deleteNote]
  );
}
