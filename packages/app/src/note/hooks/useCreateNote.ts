import { useMutation } from '@apollo/client';

import { gql } from '../../__generated__/gql';
import { CreateNoteInput } from '../../__generated__/graphql';

const MUTATION = gql(`
  mutation UseCreateNote($input: CreateNoteInput!)  {
    createNote(input: $input) {
      note {
        id
        contentId
        textFields {
          key
          value {
            id
            headText {
              revision
              changeset
            }
          }
        }
      }
    }
  }
`);

const CACHE_UPDATE_NOTES_CONNECTION = gql(`
query CreateNoteUpdateNotesConnection {
  notesConnection {
    notes {
      id
      contentId
      textFields {
        key
        value {
          id
          headText {
            changeset
            revision
          }
        }
      }
    }
  }
}
`);

export default function useCreateNote() {
  const [createNote] = useMutation(MUTATION);

  return async (note: CreateNoteInput['note']) => {
    const { data } = await createNote({
      variables: {
        input: {
          note,
        },
      },
      update(cache, { data }) {
        if (!data?.createNote) return;

        const newNote = data.createNote.note;

        cache.updateQuery(
          {
            query: CACHE_UPDATE_NOTES_CONNECTION,
          },
          (existing) => {
            if (!existing) {
              return {
                notesConnection: {
                  notes: [newNote],
                },
              };
            }

            if (existing.notesConnection.notes.some((note) => note?.id === newNote.id)) {
              return;
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
