import { useMutation } from '@apollo/client';

import { gql } from '../../../__generated__/gql';
import { Note } from '../../../__generated__/graphql';

const MUTATION = gql(`
  mutation UseCreateNote($input: CreateNoteInput!)  {
    createNote(input: $input) {
      note {
        id
        title
        textContent
      }
    }
  }
`);

type PartialNote = Pick<Note, 'id' | 'title' | 'textContent'>;

export default function useCreateNote(): (
  title: string,
  content: string
) => Promise<PartialNote | null> {
  const [createNote] = useMutation(MUTATION);

  return async (title, content) => {
    const { data } = await createNote({
      variables: {
        input: {
          note: {
            title,
            textContent: content,
          },
        },
      },
      optimisticResponse: {
        createNote: {
          note: {
            id: 'CreateNote',
            title,
            textContent: content,
          },
        },
      },
      update(cache, { data }) {
        if (!data?.createNote) return;

        const newNote = data.createNote.note;

        cache.updateQuery(
          {
            query: gql(`
              query CreateNoteUpdateNotesConnection {
                notesConnection {
                  notes {
                    id
                    title
                    textContent
                  }
                }
              }
          `),
          },
          (existing) => {
            if (!existing) {
              return {
                notesConnection: {
                  notes: [newNote],
                },
              };
            }

            if (existing.notesConnection.notes.some((note) => note.id === newNote.id)) {
              return existing;
            }

            return {
              notesConnection: {
                ...existing.notesConnection,
                notes: [...existing.notesConnection.notes, newNote],
              },
            };
          }
        );
      },
    });

    const note = data?.createNote?.note;

    if (!note) return null;

    return note;
  };
}
