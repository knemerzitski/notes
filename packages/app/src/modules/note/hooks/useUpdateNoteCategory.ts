import { useMutation } from '@apollo/client';

import { useCallback } from 'react';

import { gql } from '../../../__generated__/gql';
import { Note, NoteCategory } from '../../../__generated__/graphql';
import { useCustomApolloClient } from '../../apollo-client/context/CustomApolloClientProvider';

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

export const FRAGMENT_NOTE = gql(`
  fragment UseUpdateNoteCategorySingleUpdate on Note {
    categoryName
  }
`);

const QUERY_CHANGE_CONNECTION_CATEGORY = gql(`
  query UseUpdateNoteChangeCategoryNotesConnection($from: NoteCategory, $to: NoteCategory) {
    fromNotesConnection: notesConnection(category: $from) {
      notes {
        id
      }
    }
    toNotesConnection: notesConnection(category: $to) {
      notes {
        id
      }
    }
  }
`);

type PartialNote = Pick<Note, 'id' | 'contentId' | 'categoryName'>;

export default function useUpdateNoteCategory() {
  const customApolloClient = useCustomApolloClient();
  const [updateNote] = useMutation(MUTATION);

  return useCallback(
    (note: PartialNote) => {
      void updateNote({
        variables: {
          input: {
            contentId: note.contentId,
            patch: {
              categoryName: note.categoryName,
            },
          },
        },
        optimisticResponse: {
          updateNote: {
            patch: {
              id: String(note.id),
              categoryName: note.categoryName,
            },
          },
        },
        update(cache, { data }) {
          const patch = data?.updateNote.patch;
          if (!patch) return;
          const newCategoryName = patch.categoryName;
          if (!newCategoryName) return;

          const noteWithType: Pick<Note, 'id' | '__typename'> = {
            id: patch.id,
            __typename: 'Note',
          };
          const noteCacheId = cache.identify(noteWithType);

          // Read current category
          const currentCategoryName =
            cache.readFragment({
              id: noteCacheId,
              fragment: FRAGMENT_NOTE,
            })?.categoryName ?? NoteCategory.Default;

          // TODO test if correct cache is used with write fragment
          // Update Note with new category
          customApolloClient.writeFragmentNoRetain(
            {
              id: noteCacheId,
              fragment: FRAGMENT_NOTE,
              data: {
                categoryName: newCategoryName,
              },
            },
            {
              cache,
            }
          );

          // Update notesConnections, move Note from one list to other
          cache.updateQuery(
            {
              query: QUERY_CHANGE_CONNECTION_CATEGORY,
              variables: {
                from: currentCategoryName,
                to: newCategoryName,
              },
            },
            (data) => {
              if (!data) {
                return {
                  fromNotesConnection: {
                    notes: [],
                  },
                  toNotesConnection: {
                    notes: [noteWithType],
                  },
                };
              }

              const toIndex = data.toNotesConnection.notes.findIndex(
                (note) => note.id === noteWithType.id
              );
              // Note already in correct category, abort
              if (toIndex !== -1) return;

              let fromNotesResult = data.fromNotesConnection.notes;
              const fromIndex = fromNotesResult.findIndex(
                (note) => note.id === noteWithType.id
              );
              if (fromIndex !== -1) {
                fromNotesResult = [
                  ...fromNotesResult.slice(0, fromIndex),
                  ...fromNotesResult.slice(fromIndex + 1),
                ];
              }

              return {
                ...data,
                fromNotesConnection: {
                  ...data.fromNotesConnection,
                  notes: fromNotesResult,
                },
                toNotesConnection: {
                  ...data.toNotesConnection,
                  notes: [...data.toNotesConnection.notes, noteWithType],
                },
              };
            }
          );
        },
      });
    },
    [updateNote, customApolloClient]
  );
}
