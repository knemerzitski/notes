import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import {
  getUserNoteLinkIdFromByInput,
  parseUserNoteLinkByInput,
} from '../../utils/id';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';

const AddUnsavedNote_Query = gql(`
  query AddUnsavedNote_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        unsavedNotes {
          id
        }
      }
    }
  }
`);

export function addUnsavedNote(
  by: UserNoteLinkByInput,
  cache: Pick<
    ApolloCache<unknown>,
    'writeQuery' | 'readQuery' | 'readFragment' | 'identify'
  >
) {
  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);
  const { userId } = parseUserNoteLinkByInput(by, cache);

  cache.writeQuery({
    query: AddUnsavedNote_Query,
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'SignedInUser',
        id: userId,
        local: {
          __typename: 'LocalSignedInUser',
          id: userId,
          unsavedNotes: [
            {
              __typename: 'UserNoteLink',
              id: userNoteLinkId,
            },
          ],
        },
      },
    },
  });
}
