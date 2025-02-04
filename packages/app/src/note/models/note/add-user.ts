import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { NoteByInput, UserNoteLink } from '../../../__generated__/graphql';
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
  userNoteLinkId: UserNoteLink['id'],
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
        id: parseUserNoteLinkId(userNoteLinkId).noteId,
        users: [
          {
            __typename: 'UserNoteLink',
            id: userNoteLinkId,
          },
        ],
      },
    },
  });
}
