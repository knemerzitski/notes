import { useApolloClient, useMutation } from '@apollo/client';

import { Note } from '../../__generated__/graphql';
import transformDocument from '../../transformDocument';
import CREATE_NOTE from '../documents/CREATE_NOTE';
import GET_NOTES from '../documents/GET_NOTES';

export default function useCreateNote(): (
  title: string,
  content: string
) => Promise<Note | null> {
  const apolloClient = useApolloClient();
  const [createNote] = useMutation(CREATE_NOTE);

  return async (title, content) => {
    const result = await createNote({
      variables: {
        input: {
          title,
          content,
        },
      },
      optimisticResponse: {
        createNote: {
          id: 'Note',
          title,
          content,
        },
      },
      update(cache, { data }) {
        if (!data?.createNote) return;
        const createNote = data.createNote;
        cache.updateQuery(
          {
            query: transformDocument(apolloClient, GET_NOTES),
          },
          (cacheData) => {
            if (!cacheData?.notes) return;

            if (cacheData.notes.some((cachedNote) => cachedNote.id === createNote.id)) {
              return cacheData;
            }
            return { notes: [createNote, ...cacheData.notes] };
          }
        );
      },
    });

    return result.data?.createNote ?? null;
  };
}
