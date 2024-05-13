import { ApolloCache } from '@apollo/client';
import { gql } from '../../__generated__';
import { InsertNoteToNotesConnectionQuery } from '../../__generated__/graphql';

const QUERY = gql(`
  query InsertNoteToNotesConnection {
    notesConnection {
      notes {
        id
      }
    }
  }
`);

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
