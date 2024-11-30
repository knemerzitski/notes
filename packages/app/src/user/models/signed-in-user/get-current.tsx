import { ApolloCache } from '@apollo/client';
import { Maybe } from '~utils/types';
import { gql } from '../../../__generated__';

const GetCurrentUserId_Query = gql(`
  query GetCurrentUserId_Query {
    currentSignedInUser {
      id
    }
  }
`);

export function getCurrentUserId(
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): Maybe<string> {
  if (userIdOverride.override) {
    return userIdOverride.userId;
  }

  const data = cache.readQuery({
    query: GetCurrentUserId_Query,
  });

  return data?.currentSignedInUser.id;
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
