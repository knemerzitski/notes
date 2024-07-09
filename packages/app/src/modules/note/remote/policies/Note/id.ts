import { FieldPolicy } from '@apollo/client';

import { gql } from '../../../../../__generated__/gql';
import { Note } from '../../../../../__generated__/graphql';

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
