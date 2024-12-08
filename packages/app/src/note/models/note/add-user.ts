import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { NoteByInput, PublicUserNoteLink } from '../../../__generated__/graphql';
import { parseUserNoteLinkId } from '../../utils/id';

const AddUserToNote_Query = gql(`
  query AddUserToNote_Query($by: NoteByInput!) {
    note(by: $by){
      id
      users {
        id
      }
    }
  }
`);

export function addUserToNote(
  publicUserNoteLinkId: PublicUserNoteLink['id'],
  by: NoteByInput,
  cache: ApolloCache<unknown>
) {
  cache.writeQuery({
    query: AddUserToNote_Query,
    variables: {
      by,
    },
    data: {
      __typename: 'Query',
      note: {
        __typename: 'Note',
        id: parseUserNoteLinkId(publicUserNoteLinkId).noteId,
        users: [
          {
            __typename: 'PublicUserNoteLink',
            id: publicUserNoteLinkId,
          },
        ],
      },
    },
  });
}
