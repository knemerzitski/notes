import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import useNoteByContentId from './useNoteByContentId';
import { gql } from '../../../__generated__/gql';
import { removeActiveNotes } from '../active-notes';

const MUTATION = gql(`
  mutation UseDeleteNote($input: DeleteNoteInput!) {
    deleteNote(input: $input) {
      deleted
    }
  }
`);

export default function useDeleteNote() {
  const [deleteNote] = useMutation(MUTATION);

  const noteContentIdToId = useNoteByContentId();

  return useCallback(
    async (deleteContentId: string) => {
      const result = await deleteNote({
        variables: {
          input: {
            contentId: deleteContentId,
          },
        },
        optimisticResponse: {
          deleteNote: {
            deleted: true,
          },
        },
        update(cache, result) {
          const { data } = result;
          if (!data?.deleteNote.deleted) return;

          const note = noteContentIdToId(deleteContentId);
          if (note) {
            removeActiveNotes(cache, [note]);
            cache.evict({
              id: cache.identify(note),
            });
            cache.gc();
          }
        },
      });

      return result.data?.deleteNote.deleted ?? false;
    },
    [deleteNote, noteContentIdToId]
  );
}
