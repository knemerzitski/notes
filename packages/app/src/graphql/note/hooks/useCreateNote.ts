import { useMutation } from '@apollo/client';

import { gql } from '../../../__generated__/gql';
import { CreateNoteInput, CreateNotePayload } from '../../../__generated__/graphql';

const MUTATION = gql(`
  mutation UseCreateNote($input: CreateNoteInput!)  {
    createNote(input: $input) {
      note {
        id
        title
        content {
          revision
          text
        }
        preferences {
          backgroundColor
        }
      }
    }
  }
`);

export default function useCreateNote(): (
  note: CreateNoteInput['note']
) => Promise<CreateNotePayload['note'] | undefined> {
  const [createNote] = useMutation(MUTATION);

  return async (note) => {
    const { data } = await createNote({
      variables: {
        input: {
          note,
        },
      },
      optimisticResponse: {
        createNote: {
          note: {
            __typename: 'Note',
            id: 'CreateNote',
            title: note?.title ?? '',
            content: {
              revision: 0,
              text: note?.textContent ?? '',
            },
            preferences: {
              backgroundColor: note?.preferences?.backgroundColor,
            },
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
                    content {
                      revision
                      text
                    }
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

    return data?.createNote?.note;
  };
}
