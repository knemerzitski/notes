import { ApolloCache, FieldPolicy, NormalizedCacheObject, gql } from '@apollo/client';
import { EvictFieldPolicy, EvictTag } from '../../../apollo-client/policy/evict';
import { getCurrentUserIdInStorage } from '../../../auth/user';
import { relayStylePagination } from '@apollo/client/utilities';
import { KeySpecifierName } from '../../../apollo-client/key-specifier';
import { InsertNoteToNotesConnectionQuery } from '../../../../__generated__/graphql';

const QUERY = gql(`
  query InsertNoteToNotesConnection {
    notesConnection {
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
  ...relayStylePagination(
    () =>
      `notesConnection:${JSON.stringify({
        [KeySpecifierName.UserId]: getCurrentUserIdInStorage(),
      })}`
  ),
};

type NotesConnectionNote = NonNullable<
  InsertNoteToNotesConnectionQuery['notesConnection']['notes'][0]
>;

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
    },
    (data) => {
      if (!data) {
        return {
          notesConnection: {
            notes: [insertNewNote],
          },
        };
      }

      if (data.notesConnection.notes.some((note) => note?.id === insertNewNote.id)) {
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
