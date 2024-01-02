import { useMutation } from '@apollo/client';

import { Note } from '../../__generated__/graphql';
import GET_NOTE from '../operations/GET_NOTE';
import GET_NOTES from '../operations/GET_NOTES';
import UPDATE_NOTE from '../operations/UPDATE_NOTE';

export default function useUpdateNote(): (note: Note) => Promise<Note | undefined> {
  const [updateNote] = useMutation(UPDATE_NOTE());

  return async (note) => {
    const result = await updateNote({
      variables: {
        input: {
          id: note.id,
          patch: {
            note: {
              title: note.title,
              textContent: note.textContent,
            },
          },
        },
      },
      optimisticResponse: {
        updateUserNote: {
          note: {
            note: {
              id: note.id,
              title: note.title,
              textContent: note.textContent,
            },
          },
        },
      },
      update(cache, { data }) {
        if (!data?.updateUserNote) return;

        cache.writeQuery({
          query: GET_NOTE(),
          data: {
            userNote: {
              note: data.updateUserNote.note.note,
            },
          },
          variables: {
            id: note.id,
          },
        });

        cache.updateQuery(
          {
            query: GET_NOTES(),
          },
          (cacheData) => {
            if (!cacheData?.userNotesConnection) return;

            return {
              userNotesConnection: {
                notes: cacheData.userNotesConnection.notes.map((cacheNote) =>
                  cacheNote.note.id === note.id ? { note } : cacheNote
                ),
              },
            };
          }
        );
      },
    });

    return result.data?.updateUserNote.note.note;
  };
}
