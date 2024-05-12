import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../__generated__/gql';
import { activeNotesVar } from '../state/reactive-vars';

const MUTATION = gql(`
  mutation UseDeleteNote($input: DeleteNoteInput!) {
    deleteNote(input: $input) {
      deleted
    }
  }
`);

const QUERY_UPDATE = gql(`
  query UseDeleteNoteUserNotesMapping {
    userNoteMappings @client {
      user {
        id
      }
      note {
        id
        contentId
      }
    }
  }
`);

export default function useDeleteNote() {
  const [deleteNote] = useMutation(MUTATION);

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
        update(cache, { data }) {
          if (!data?.deleteNote.deleted) return;

          const queryResult = cache.readQuery({
            query: QUERY_UPDATE,
          });
          if (!queryResult) return;
          const { userNoteMappings } = queryResult;

          const deletedUserNoteMappings = userNoteMappings.filter(
            ({ note: { contentId } }) => contentId === deleteContentId
          );

          // Remove note from list of active notes
          const updatedActiveNotes = activeNotesVar();
          deletedUserNoteMappings.forEach((deletedUserNote) => {
            const noteRef = cache.identify(deletedUserNote.note);
            if (noteRef) {
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete updatedActiveNotes[noteRef];
            }
          });
          activeNotesVar(updatedActiveNotes);

          // Evict note related data from cache
          deletedUserNoteMappings.forEach((deletedUserNote) => {
            const userNoteMappingId = cache.identify(deletedUserNote);
            const noteId = cache.identify(deletedUserNote.note);
            cache.evict({
              id: noteId,
            });
            cache.evict({
              id: userNoteMappingId,
            });
          });
          cache.gc();
        },
      });

      return result.data?.deleteNote.deleted ?? false;
    },
    [deleteNote]
  );
}
