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
