import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { getCurrentUserId } from './get-current';
import { setCurrentUser } from './set-current';

const RemoveUsers_Query = gql(`
  query RemoveUsers_Query {
    signedInUsers {
      id
    }
  }
`);

/**
 * Remove everything related to user from cache.
 * @param removeUserIds userIds to remove or null to remove all users
 * @param cache
 */
export function removeUsers(
  removeUserIds: string[] | null,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'writeQuery' | 'updateQuery'>
) {
  // Clear currentUserId if it's in array or array is undefined
  const currentUserId = getCurrentUserId(cache);
  if (currentUserId) {
    if (!removeUserIds || removeUserIds.includes(currentUserId)) {
      setCurrentUser(null, cache);
    }
  }

  // TODO must call taggedEvict with EvictTag with withOverrideCurrentUserId (util evictByUser)
  // TODO call gc?

  return cache.updateQuery(
    {
      query: RemoveUsers_Query,
      overwrite: true,
    },
    (data) => {
      if (!data) return;

      if (removeUserIds === null) {
        return {
          __typename: 'Query' as const,
          signedInUsers: [],
        };
      }

      return {
        __typename: 'Query' as const,
        signedInUsers: data.signedInUsers.filter(({ id }) => !removeUserIds.includes(id)),
      };
    }
  );
}
