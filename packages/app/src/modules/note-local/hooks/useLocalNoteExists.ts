import { useQuery } from '@apollo/client';
import { gql } from '../../../__generated__/gql';

const QUERY = gql(`
  query UseLocalNoteExists($id: ID!)  {
    localNote(id: $id) @client {
      id
    }
  }
`);

export default function useLocalNoteExists(localNoteId: string) {
  const query = useQuery(QUERY, {
    fetchPolicy: 'cache-only',
    variables: {
      id: localNoteId,
    },
  });

  return query.data?.localNote.id != null;
}
