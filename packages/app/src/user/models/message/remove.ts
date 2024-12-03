import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { SignedInUser, UserMessage } from '../../../__generated__/graphql';

const RemoveUserMessages_Query = gql(`
  query RemoveUserMessages_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        messages {
          id
        }
      }
    }
  }
`);

/**
 * Remove everything related to user from cache.
 * @param removeUserIds userIds to remove or null to remove all users
 * @param cache
 */
export function removeUserMessages(
  userId: SignedInUser['id'],
  messageIds: UserMessage['id'][],
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'writeQuery' | 'updateQuery' | 'evict' | 'identify'
  >
) {
  cache.updateQuery(
    {
      query: RemoveUserMessages_Query,
      variables: {
        id: userId,
      },
      overwrite: true,
    },
    (data) => {
      if (!data?.signedInUser) return;

      return {
        ...data,
        signedInUser: {
          ...data.signedInUser,
          id: userId,
          local: {
            ...data.signedInUser.local,
            id: userId,
            messages: data.signedInUser.local.messages.filter(
              (msg) => !messageIds.includes(msg.id)
            ),
          },
        },
      };
    }
  );
  // TODO instead of evict, in policy set keyargs false
  for (const id of messageIds) {
    cache.evict({
      id: cache.identify({
        __typename: 'UserMessage',
        id,
      }),
    });
  }
}
