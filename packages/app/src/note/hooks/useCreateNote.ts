import { useMutation } from '@apollo/client';

import { gql } from '../../__generated__/gql';
import { CreateNoteInput, NoteTextField } from '../../__generated__/graphql';
import { Changeset } from '~collab/changeset/changeset';

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
            viewText @client
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
    const titleField = note?.textFields?.find(({ key }) => key === NoteTextField.Title);
    const contentField = note?.textFields?.find(
      ({ key }) => key === NoteTextField.Content
    );
    const titleText = titleField?.value.initialText ?? '';
    const contentText = contentField?.value.initialText ?? '';

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
            id: 'optimistic:id',
            contentId: 'optimistic:contentId',
            textFields: [
              {
                key: NoteTextField.Title,
                value: {
                  id: 'optimistic:title:id',
                  headText: {
                    changeset: Changeset.fromInsertion(titleText).serialize(),
                    revision: 0,
                  },
                  viewText: titleText,
                },
              },
              {
                key: NoteTextField.Content,
                value: {
                  id: 'optimistic:content:id',
                  headText: {
                    changeset: Changeset.fromInsertion(contentText).serialize(),
                    revision: 0,
                  },
                  viewText: contentText,
                },
              },
            ],
          },
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
