import { ApolloCache, useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../../../__generated__/gql';

import { getExistingNoteWithCategory } from './useUpdateNoteCategory';

const QUERY = gql(`
  query DeleteNoteFromNotesConnection($category: NoteCategory) {
    notesConnection(category: $category) {
      notes {
        id
        contentId
      }
    }
  }
`);

export function useInsertNoteToNotesConnection() {
  const apolloClient = useApolloClient();

  return useCallback(
    (noteContentId: string) => {
      deleteNoteFromNotesConnection(apolloClient.cache, noteContentId);
    },
    [apolloClient]
  );
}

export function deleteNoteFromNotesConnection<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  noteContentId: string
) {
  const existingNote = getExistingNoteWithCategory(cache, noteContentId);
  if (!existingNote) return;

  cache.updateQuery(
    {
      query: QUERY,
      variables: {
        category: existingNote.categoryName,
      },
    },
    (data) => {
      if (!data) {
        return;
      }

      const index: number = data.notesConnection.notes.findIndex(
        (note) => note.id == existingNote.id
      );
      if (index === -1) {
        return;
      }

      return {
        ...data,
        notesConnection: {
          ...data.notesConnection,
          notes: [
            ...data.notesConnection.notes.slice(0, index),
            ...data.notesConnection.notes.slice(index + 1),
          ],
        },
      };
    }
  );
}
