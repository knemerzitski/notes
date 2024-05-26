import { gql } from '../../../__generated__/gql';
import { ApolloCache } from '@apollo/client';

const QUERY = gql(`
  query SignedInUser {
    signedInUsers @client {
      id
      isSessionExpired
    }
    currentSignedInUser @client {
      id
    }
  }
`);

const QUERY_ADD = gql(`
  query SignedInUserAdd {
    signedInUsers @client {
      id
      __typename
    }
  }
`);

export function addSignedInUser<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  userId: string
) {
  return cache.updateQuery(
    {
      query: QUERY_ADD,
    },
    (data) => {
      const user = {
        __typename: 'User' as const,
        id: userId,
      };
      
      if (!data) {
        return {
          signedInUsers: [user],
        };
      }

      if (data.signedInUsers.some(({ id }) => id === userId)) {
        return;
      }

      return {
        signedInUsers: [...data.signedInUsers, user],
      };
    }
  );
}

/**
 *
 * @param userId Set null to leave currentSignedInUser empty
 */
export function setCurrentSignedInUser<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  userId: string | undefined | null
) {
  return cache.updateQuery(
    {
      query: QUERY,
      overwrite: true,
    },
    (data) => {
      if (!data) return;
      if (data.currentSignedInUser?.id === userId) return;

      return {
        ...data,
        currentSignedInUser:
          (userId ? data.signedInUsers.find(({ id }) => id === userId) : null) ?? null,
      };
    }
  );
}

/**
 *
 * @param userId Set null to remove all users
 */
export function removeUser<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  userId?: string | null
) {
  const result = cache.updateQuery(
    {
      query: QUERY,
      overwrite: true,
    },
    (data) => {
      if (!userId) {
        return {
          signedInUsers: [],
          currentSignedInUser: null,
        };
      }

      if (!data) return;

      const newSignedInUsers = data.signedInUsers.filter(({ id }) => id !== userId);

      let newCurrentSignedInUser = data.currentSignedInUser;
      if (data.currentSignedInUser?.id === userId) {
        newCurrentSignedInUser =
          newSignedInUsers?.find((user) => !user?.isSessionExpired) ??
          newSignedInUsers?.[0];
      }

      return {
        signedInUsers: newSignedInUsers,
        currentSignedInUser: newCurrentSignedInUser,
      };
    }
  );

  if (userId) {
    cache.evict({
      id: cache.identify({
        __typename: 'User',
        id: userId,
      }),
    });
    cache.gc();
  }

  return result;
}
