import { useMutation } from '@apollo/client';

import { Note } from '../../__generated__/graphql';
import useTransformDocument from '../../graphql/useTransformDocument';

import GET_NOTE from './GET_NOTE';
import GET_NOTES from './GET_NOTES';
import UPDATE_NOTE from './UPDATE_NOTE';

export default function useUpdateNote(): (note: Note) => Promise<boolean> {
  const [updateNote] = useMutation(UPDATE_NOTE);
  const TGET_NOTE = useTransformDocument(GET_NOTE);
  const TGET_NOTES = useTransformDocument(GET_NOTES);

  return async (note) => {
    const result = await updateNote({
      variables: {
        note,
      },
      optimisticResponse: {
        updateNote: true,
      },
      update(cache, { data }) {
        if (!data?.updateNote) return;

        cache.writeQuery({
          query: TGET_NOTE,
          data: {
            note,
          },
          variables: {
            id: note.id,
          },
        });

        cache.updateQuery(
          {
            query: TGET_NOTES,
          },
          (cacheData) => {
            if (!cacheData) return;

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
