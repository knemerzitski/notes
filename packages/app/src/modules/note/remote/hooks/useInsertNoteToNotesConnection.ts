import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../../../__generated__/gql';
import {
  InsertNoteToNotesConnectionQuery,
  Note,
  NoteCategory,
} from '../../../../__generated__/graphql';

const QUERY = gql(`
  query InsertNoteToNotesConnection($category: NoteCategory) {
    notesConnection(category: $category) {
      notes {
        id
        contentId
      }
    }
  }
`);

type NotesConnectionNote = NonNullable<
  InsertNoteToNotesConnectionQuery['notesConnection']['notes'][0]
> & {
  categoryName?: Note['categoryName'];
};

export function useInsertNoteToNotesConnection() {
  const apolloClient = useApolloClient();

  return useCallback(
    (note: NotesConnectionNote) => {
      const insertNewNote: NotesConnectionNote = {
        __typename: 'Note',
        ...note,
      };

      apolloClient.cache.updateQuery(
        {
          query: QUERY,
          variables: {
            category: note.categoryName ?? NoteCategory.DEFAULT,
          },
        },
        (data) => {
          if (!data) {
            return {
              notesConnection: {
                notes: [insertNewNote],
              },
            };
          }

          if (data.notesConnection.notes.some((note) => note.id === insertNewNote.id)) {
            return;
          }

          return {
            ...data,
            notesConnection: {
              ...data.notesConnection,
              notes: [...data.notesConnection.notes, insertNewNote],
            },
          };
        }
      );
    },
    [apolloClient]
  );
}
