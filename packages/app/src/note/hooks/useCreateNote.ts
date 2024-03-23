import { useMutation } from '@apollo/client';

import { gql } from '../../__generated__/gql';
import { CreateNoteInput, CreateNotePayload } from '../../__generated__/graphql';

const MUTATION = gql(`
  mutation UseCreateNote($input: CreateNoteInput!)  {
    createNote(input: $input) {
      note {
        id
        textFields {
          key
          value {
            headRevision
            headText
            viewText @client
          }
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
    const optimisticTextFields = note?.textFields?.map(({ key, value }) => ({
      key,
      value: {
        headText: value.initialText ?? '',
        viewText: value.initialText ?? '',
        headRevision: 0,
      },
    }));

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
            textFields: optimisticTextFields ?? [],
            // preferences: {
            //   backgroundColor: note?.preferences?.backgroundColor,
            // },
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
                    textFields {
                      key
                      value {
                        headText
                        headRevision
                      }
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
