import { useMutation } from '@apollo/client';

import { Note } from '../../__generated__/graphql';
import CREATE_NOTE from '../documents/CREATE_NOTE';
import GET_NOTES from '../documents/GET_NOTES';

export default function useCreateNote(): (
  title: string,
  textContent: string
) => Promise<Note | null> {
  const [createNote] = useMutation(CREATE_NOTE());

  return async (title, textContent) => {
    const result = await createNote({
      variables: {
        input: {
          newNote: {
            title,
            textContent,
          },
        },
      },
      optimisticResponse: {
        createUserNote: {
          note: {
            id: 'Note',
            note: {
              id: 'Note',
              title,
              textContent,
            },
          },
        },
      },
      update(cache, { data }) {
        if (!data?.createUserNote) return;
        const createNote = data.createUserNote;
        cache.updateQuery(
          {
            query: GET_NOTES(),
          },
          (cacheData) => {
            if (!cacheData?.userNotesConnection)
              return {
                userNotesConnection: {
                  notes: [],
                },
              };

            if (
              cacheData.userNotesConnection.notes.some(
                (cachedNote) => cachedNote.note.id === createNote.note.id
              )
            ) {
              return cacheData;
            }

            return {
              userNotesConnection: {
                notes: [createNote.note, ...cacheData.userNotesConnection.notes],
              },
            };
          }
        );
      },
    });

    const note = result.data?.createUserNote?.note;

    if (!note) return null;

    console.log('ret', note);

    return note.note;
  };
}
