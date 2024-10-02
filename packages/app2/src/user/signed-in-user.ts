import { ApolloCache } from '@apollo/client';
import { gql } from '../__generated__';
import { SignedInUserQuery } from '../__generated__/graphql';
import { Maybe, PartialDeep } from '~utils/types';

const SIGNED_IN_USER = gql(`
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

const SIGNED_IN_USERS_WRITE = gql(`
  query SignedInUsersWrite {
    signedInUsers @client {
      id
      __typename
    }
  }
`);

export function addSignedInUser(
  userId: string,
  cache: Pick<ApolloCache<unknown>, 'updateQuery'>
) {
  return cache.updateQuery(
    {
      query: SIGNED_IN_USERS_WRITE,
    },
    (data) => {
      const user = {
        __typename: 'SignedInUser' as const,
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

export function setCurrentSignedInUser(
  userId: Maybe<string>,
  cache: Pick<ApolloCache<unknown>, 'updateQuery'>
) {
  const result = cache.updateQuery(
    {
      query: SIGNED_IN_USER,
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
  return result?.currentSignedInUser?.id == userId;
}

export function getCurrentSignedInUserId(
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): Maybe<string> {
  if (userIdOverride.override) {
    return userIdOverride.userId;
  }

  const data = cache.readQuery({
    query: SIGNED_IN_USER,
    returnPartialData: true,
  });
  if (!data) return;
  return findAvailableUserId(data);
}

const userIdOverride = {
  override: false,
  userId: null as Maybe<string>,
};

function overrideUser(userId: Maybe<string>) {
  userIdOverride.userId = userId;
  userIdOverride.override = true;
}

function clearOverrideUser() {
  userIdOverride.override = false;
  userIdOverride.userId = null;
}

export function withOverrideCurrentUserId<T>(
  userId: Maybe<string>,
  fn: () => Awaited<T>
): Awaited<T> {
  overrideUser(userId);
  try {
    return fn();
  } finally {
    clearOverrideUser();
  }
}

function findAvailableUserId(data: PartialDeep<SignedInUserQuery>) {
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
