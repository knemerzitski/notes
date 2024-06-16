import { gql } from '../../__generated__/gql';
import { ApolloCache, useSuspenseQuery } from '@apollo/client';
import { localStorageKey, LocalStoragePrefix } from '../storage/local-storage';
import { DeepPartial } from '@apollo/client/utilities';
import { SignedInUserQuery } from '../../__generated__/graphql';

const KEY = localStorageKey(LocalStoragePrefix.Auth, 'currentUserId');

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

function setCurrentUserIdInStorage(
  userId: string | undefined | null,
  storage = localStorage
) {
  if (userId) {
    storage.setItem(KEY, userId);
  } else {
    storage.removeItem(KEY);
  }
}

export function getCurrentUserIdInStorage(storage = localStorage) {
  return storage.getItem(KEY);
}

export function withDifferentUserIdInStorage(
  userId: string | undefined | null,
  fn: () => void,
  storage = localStorage
) {
  const savedUserId = getCurrentUserIdInStorage(storage);
  if (savedUserId === userId) {
    fn();
  } else {
    try {
      setCurrentUserIdInStorage(userId, storage);
      fn();
    } finally {
      setCurrentUserIdInStorage(savedUserId, storage);
    }
  }
}

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
  setCurrentUserIdInStorage(userId);

  const result = cache.updateQuery(
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

  // Sanity check to match cache value
  const newUserId = result?.currentSignedInUser?.id;
  setCurrentUserIdInStorage(newUserId ? String(newUserId) : null);

  return result;
}

/**
 *
 * @param userId Set null to remove all users
 */
export function removeUser<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  userId?: string | null
) {
  return cache.updateQuery(
    {
      query: QUERY,
      overwrite: true,
    },
    (data) => {
      if (!data) return;

      if (!userId) {
        return {
          signedInUsers: [],
          currentSignedInUser: null,
        };
      }

      const newSignedInUsers = data.signedInUsers.filter(({ id }) => id !== userId);

      let newCurrentSignedInUser = data.currentSignedInUser;
      if (data.currentSignedInUser?.id === userId) {
        newCurrentSignedInUser =
          newSignedInUsers.find((user) => !user.isSessionExpired) ??
          newSignedInUsers[0] ??
          null;
      }

      return {
        signedInUsers: newSignedInUsers,
        currentSignedInUser: newCurrentSignedInUser,
      };
    }
  );
}

export function setAvailableUsers<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  actualAvailableUserIds: string[],
  setSessionExpired = true
) {
  return cache.updateQuery(
    {
      query: QUERY,
      overwrite: true,
    },
    (data) => {
      if (!data) return;

      const newSignedInUsers = setSessionExpired
        ? data.signedInUsers.map((user) =>
            actualAvailableUserIds.includes(String(user.id))
              ? user
              : { ...user, isSessionExpired: true }
          )
        : data.signedInUsers.filter(({ id }) =>
            actualAvailableUserIds.includes(String(id))
          );

      let newCurrentSignedInUser = data.currentSignedInUser;
      const userId = newCurrentSignedInUser?.id;
      if (userId) {
        if (!newSignedInUsers.some(({ id }) => id === userId)) {
          newCurrentSignedInUser =
            newSignedInUsers.find((user) => !user.isSessionExpired) ??
            newSignedInUsers[0] ??
            null;
        }
      }

      return {
        signedInUsers: newSignedInUsers,
        currentSignedInUser: newCurrentSignedInUser,
      };
    }
  );
}

export function getSignedInUserIds<TCacheShape>(cache: ApolloCache<TCacheShape>) {
  return (
    cache
      .readQuery({
        query: QUERY,
      })
      ?.signedInUsers.map(({ id }) => String(id)) ?? []
  );
}

export function useCurrentUserId(): string | undefined {
  const { data } = useSuspenseQuery(QUERY, {
    returnPartialData: true,
  });
  return findAvailableUserId(data);
}

export function getCurrentUserId<TCacheShape>(
  cache: ApolloCache<TCacheShape>
): string | undefined {
  const data = cache.readQuery({
    query: QUERY,
    returnPartialData: true,
  });
  if (!data) return;
  return findAvailableUserId(data);
}

function findAvailableUserId(data: DeepPartial<SignedInUserQuery>) {
  let currentId = data.currentSignedInUser?.id;
  if (!currentId) {
    const firstUser =
      data.signedInUsers?.find((user) => !user?.isSessionExpired) ??
      data.signedInUsers?.[0];
    if (firstUser) {
      currentId = firstUser.id;
    }
  }
  return currentId ? String(currentId) : undefined;
}
