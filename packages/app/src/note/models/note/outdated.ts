import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const UserNoteLinkOutdated_Query = gql(`
  query UserNoteLinkOutdated_Query($id: UserNoteLinkID!) {
    userNoteLink(by: { userNoteLinkId: $id }) {
      id
      outdated
    }
  }
`);

export function isUserNoteLinkOutdated(
  userNoteLinkId: string,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: UserNoteLinkOutdated_Query,
    variables: {
      id: userNoteLinkId,
    },
  });

  return data?.userNoteLink.outdated ?? false;
}

/**
 * Update field `connectionCategoryName` with value from `categoryName` if it's not defined
 */
export function updateUserNoteLinkOutdated(
  userNoteLinkId: string,
  outdated: boolean,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: UserNoteLinkOutdated_Query,
    variables: {
      id: userNoteLinkId,
    },
    data: {
      __typename: 'Query',
      userNoteLink: {
        __typename: 'UserNoteLink',
        id: userNoteLinkId,
        outdated,
      },
    },
  });
}
