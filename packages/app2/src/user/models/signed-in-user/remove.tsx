import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { getCurrentUserId } from './get-current';
import { setCurrentUser } from './set-current';
import { evictByUser } from '../../utils/evict-by-user';
import { TaggedEvict } from '../../../graphql/utils/tagged-evict';
import { removeOngoingOperations } from '../../../graphql/link/persist/remove';
import { getAllUserOngoingOperationsIds } from '../../../graphql/link/persist/get-all-user';

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
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'writeQuery' | 'updateQuery' | 'evict' | 'gc' | 'identify' | 'modify'
  >,
  taggedEvict?: TaggedEvict
) {
  // Clear currentUserId if it's in array or array is undefined
  const currentUserId = getCurrentUserId(cache);
  if (currentUserId) {
    if (!removeUserIds || removeUserIds.includes(currentUserId)) {
      setCurrentUser(null, cache);
    }
  }

  const data = cache.updateQuery(
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

  // Evict user related fields
  const actualRemovedUserIds =
    removeUserIds ?? data?.signedInUsers.map((user) => user.id) ?? [];

  if (taggedEvict) {
    for (const userId of actualRemovedUserIds) {
      evictByUser(userId, {
        cache,
        taggedEvict,
      });
    }
  }

  // Remove persisted operations related to removed users
  const allUsersOperationsIds = getAllUserOngoingOperationsIds(
    actualRemovedUserIds,
    cache
  );
  removeOngoingOperations(allUsersOperationsIds, cache);

  cache.gc();
}
