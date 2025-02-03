import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { parseUserNoteLinkByInput } from '../../utils/id';

const ConnectionCategoryName_Query = gql(`
  query ConnectionCategoryName_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
        connectionCategoryName
      }
    }
  }
`);

export function getConnectionCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  const data = cache.readQuery({
    query: ConnectionCategoryName_Query,
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
  });

  return data?.signedInUser.noteLink.connectionCategoryName;
}

/**
 * Update field `connectionCategoryName` with value from `categoryName` if it's not defined
 */
export function updateConnectionCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'updateQuery' | 'readQuery'>
) {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  cache.updateQuery(
    {
      query: ConnectionCategoryName_Query,
      variables: {
        userBy: {
          id: userId,
        },
        noteBy: {
          id: noteId,
        },
      },
    },
    (data) => {
      if (!data) {
        return;
      }

      return {
        ...data,
        signedInUser: {
          ...data.signedInUser,
          noteLink: {
            ...data.signedInUser.noteLink,
            connectionCategoryName:
              data.signedInUser.noteLink.connectionCategoryName ??
              data.signedInUser.noteLink.categoryName,
          },
        },
      };
    }
  );
}
