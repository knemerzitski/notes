import { useApolloClient, useMutation } from '@apollo/client';

import { useCallback } from 'react';

import { gql } from '../../../../__generated__/gql';
import { Note } from '../../../../__generated__/graphql';

export const MUTATION = gql(`
  mutation UseUpdateNoteCategory($input: UpdateNoteInput!)  {
    updateNote(input: $input) {
      patch {
        id
        categoryName
      }
    }
  }
`);

const QUERY_READ = gql(`
  query UseUpdateNoteReadNoteCategory($noteContentId: String!) {
    note(contentId: $noteContentId) {
      id
      contentId
      categoryName
    }
  }
`);

const QUERY_UPDATE = gql(`
  query UseUpdateNoteChangeCategory($noteContentId: String!, $from: NoteCategory, $to: NoteCategory) {
    note(contentId: $noteContentId) {
      id
      contentId
      categoryName
    }

    fromNotesConnection: notesConnection(category: $from) {
      notes {
        id
        contentId
      }
    }
    toNotesConnection: notesConnection(category: $to) {
      notes {
        id
        contentId
      }
    }
  }
`);

type UpdateNoteArg = Pick<Note, 'contentId' | 'categoryName'>;

type UpdatedNote = Pick<Note, 'id' | 'contentId' | 'categoryName' | '__typename'>;

export default function useUpdateNoteCategory() {
  const apolloClient = useApolloClient();
  const [updateNote] = useMutation(MUTATION);

  return useCallback(
    (newNote: UpdateNoteArg) => {
      const existingData = apolloClient.readQuery({
        query: QUERY_READ,
        variables: {
          noteContentId: newNote.contentId,
        },
      });
      if (!existingData) return false;
      const existingNote = existingData.note;

      if (existingData.note.categoryName === newNote.categoryName) return false;

      void updateNote({
        variables: {
          input: {
            contentId: newNote.contentId,
            patch: {
              categoryName: newNote.categoryName,
            },
          },
        },
        optimisticResponse: {
          updateNote: {
            patch: {
              id: String(existingNote.id),
              categoryName: newNote.categoryName,
            },
          },
        },
        update(cache, { data }) {
          const patch = data?.updateNote.patch;
          if (!patch) return;
          const newCategoryName = patch.categoryName;
          if (!newCategoryName) return;

          const updatedNote: UpdatedNote = {
            id: patch.id,
            contentId: newNote.contentId,
            categoryName: newCategoryName,
            __typename: 'Note',
          };

          // Update note category and move Note from one notesConnection to other notesConnection
          cache.updateQuery(
            {
              query: QUERY_UPDATE,
              variables: {
                noteContentId: updatedNote.contentId,
                from: existingNote.categoryName,
                to: updatedNote.categoryName,
              },
            },
            (data) => {
              if (!data) {
                return {
                  note: updatedNote,
                  fromNotesConnection: {
                    notes: [],
                  },
                  toNotesConnection: {
                    notes: [updatedNote],
                  },
                };
              }

              const toIndex = data.toNotesConnection.notes.findIndex(
                (note) => note.id === updatedNote.id
              );
              // Note already in correct notesConnection
              if (toIndex !== -1)
                return {
                  ...data,
                  note: updatedNote,
                };

              let newfromNotesConnection = data.fromNotesConnection.notes;
              const fromIndex: number = newfromNotesConnection.findIndex(
                (note) => note.id === updatedNote.id
              );
              if (fromIndex !== -1) {
                newfromNotesConnection = [
                  ...newfromNotesConnection.slice(0, fromIndex),
                  ...newfromNotesConnection.slice(fromIndex + 1),
                ];
              }

              return {
                ...data,
                note: updatedNote,
                fromNotesConnection: {
                  ...data.fromNotesConnection,
                  notes: newfromNotesConnection,
                },
                toNotesConnection: {
                  ...data.toNotesConnection,
                  notes: [...data.toNotesConnection.notes, updatedNote],
                },
              };
            }
          );
        },
      });

      return {
        oldNote: existingNote,
      };
    },
    [updateNote, apolloClient]
  );
}
