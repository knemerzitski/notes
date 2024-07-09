import { ApolloCache, FieldPolicy, NormalizedCacheObject } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';

import { gql } from '../../../../../__generated__/gql';
import {
  InsertNoteToNotesConnectionQuery,
  Note,
  NoteCategory,
} from '../../../../../__generated__/graphql';
import { KeySpecifierName } from '../../../../apollo-client/key-specifier';
import { EvictFieldPolicy, EvictTag } from '../../../../apollo-client/policy/evict';
import { getCurrentUserIdInStorage } from '../../../../auth/user';

const QUERY = gql(`
  query InsertNoteToNotesConnection($category: NoteCategory) {
    notesConnection(category: $category) {
      notes {
        id
      }
    }
  }
`);

export const notesConnection: FieldPolicy & EvictFieldPolicy<NormalizedCacheObject> = {
  evict: {
    tag: EvictTag.UserSpecific,
  },
  keyArgs: ['category'],
  ...relayStylePagination(
    () =>
      `notesConnection:${JSON.stringify({
        [KeySpecifierName.UserId]: getCurrentUserIdInStorage(),
      })}`
  ),
};

type NotesConnectionNote = NonNullable<
  InsertNoteToNotesConnectionQuery['notesConnection']['notes'][0]
> & {
  categoryName?: Note['categoryName'];
};

export function insertNoteToNotesConnection<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  note: NotesConnectionNote
) {
  const insertNewNote: NotesConnectionNote = {
    __typename: 'Note',
    ...note,
  };

  cache.updateQuery(
    {
      query: QUERY,
      variables: {
        category: note.categoryName ?? NoteCategory.Default,
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
}
