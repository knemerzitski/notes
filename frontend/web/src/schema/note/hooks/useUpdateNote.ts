import { useMutation } from '@apollo/client';

import { Note } from '../../__generated__/graphql';
import GET_NOTE from '../documents/GET_NOTE';
import GET_NOTES from '../documents/GET_NOTES';
import UPDATE_NOTE from '../documents/UPDATE_NOTE';

export default function useUpdateNote(): (note: Note) => Promise<boolean> {
  const [updateNote] = useMutation(UPDATE_NOTE());

  return async (note) => {
    const result = await updateNote({
      variables: {
        input: note,
      },
      optimisticResponse: {
        updateNote: true,
      },
      update(cache, { data }) {
        if (!data?.updateNote) return;

        cache.writeQuery({
          query: GET_NOTE(),
          data: {
            note,
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
            if (!cacheData?.notes) return;

            return {
              notes: cacheData.notes.map((cacheNote) =>
                cacheNote.id === note.id ? note : cacheNote
              ),
            };
          }
        );
      },
    });

    return result.data?.updateNote ?? false;
  };
}
