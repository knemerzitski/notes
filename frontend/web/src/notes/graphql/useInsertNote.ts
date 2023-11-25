import { useMutation } from '@apollo/client';

import { Note } from '../../__generated__/graphql';
import useTransformDocument from '../../graphql/useTransformDocument';

import GET_NOTES from './GET_NOTES';
import INSERT_NOTE from './INSERT_NOTE';

export default function useInsertNote(): (
  title: string,
  content: string
) => Promise<Note | null> {
  const [insertNote] = useMutation(INSERT_NOTE);
  const TGET_NOTES = useTransformDocument(GET_NOTES);

  return async (title, content) => {
    const result = await insertNote({
      variables: {
        title,
        content,
      },
      optimisticResponse: {
        insertNote: {
          id: 'Note',
          title,
          content,
        },
      },
      update(cache, { data }) {
        if (!data?.insertNote) return;
        cache.updateQuery(
          {
            query: TGET_NOTES,
          },
          (cacheData) => {
            if (!cacheData) return;

            if (
              cacheData.notes.some((cachedNote) => cachedNote.id === data.insertNote.id)
            ) {
              return cacheData;
            }
            return { notes: [data.insertNote, ...cacheData.notes] };
          }
        );
      },
    });

    return result.data?.insertNote ?? null;
  };
}
