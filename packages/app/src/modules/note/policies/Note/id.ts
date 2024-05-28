import { FieldPolicy } from '@apollo/client';
import { Note } from '../../../../__generated__/graphql';
import { gql } from '../../../../__generated__/gql';

const QUERY = gql(`
  query NoteIdRefresh {
    currentSignedInUser @client {
      id
    }
  }
`);

export const id: FieldPolicy<Note['id'], Note['id']> = {
  read(id, { cache }) {
    cache.readQuery({
      query: QUERY,
    });

    return id;
  },
};
