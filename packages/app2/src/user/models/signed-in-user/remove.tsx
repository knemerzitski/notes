import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { getCurrentUserId } from './get-current';
import { setCurrentUser } from './set-current';
import { evictByUser } from '../../utils/evict-by-user';
import { TaggedEvict } from '../../../graphql/utils/tagged-evict';

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
    'readQuery' | 'writeQuery' | 'updateQuery' | 'evict' | 'gc'
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

  if (taggedEvict) {
    const actualRemovedUserIds =
      removeUserIds ?? data?.signedInUsers.map((user) => user.id) ?? [];
    for (const userId of actualRemovedUserIds) {
      evictByUser(userId, {
        cache,
        taggedEvict,
      });
    }
  }

  cache.gc();
}
