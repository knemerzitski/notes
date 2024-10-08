import { ApolloCache } from '@apollo/client';
import { gql } from '../../__generated__';
import { generateSignedInUserId } from './generate-signed-in-user-id';
import { InitializeLocalUserQuery } from '../../__generated__/graphql';

const INITIALIZE_LOCAL_USER = gql(`
  query InitializeLocalUser {
    localUser {
      __typename
      id
      localOnly
      public {
        __typename
        id
        profile {
          __typename
          displayName
        }
      }
    }
  }
`);

const LOCAL_USER_ID = gql(`
  query LocalUserId {
    localUser {
      id
    }
  }
`);

/**
 * Generates a local SignedInUser and writes it to cache if it doesn't exist
 */
export function primeLocalUser(
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'writeQuery' | 'readFragment' | 'identify'
  >
) {
  if (hasLocalUser(cache)) {
    return;
  }

  const localUser = generateLocalUser(cache);

  writeLocalUser(localUser, cache);

  return localUser;
}

function generateLocalUser(
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  const id = generateSignedInUserId(cache);
  return {
    __typename: 'SignedInUser',
    id,
    localOnly: true,
    public: {
      __typename: 'PublicUser',
      id,
      profile: {
        __typename: 'PublicUserProfile',
        displayName: 'Local User',
      },
    },
  } satisfies InitializeLocalUserQuery['localUser'];
}

function writeLocalUser(
  localUser: InitializeLocalUserQuery['localUser'],
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: INITIALIZE_LOCAL_USER,
    data: {
      localUser,
    },
  });
}

function hasLocalUser(cache: Pick<ApolloCache<unknown>, 'readQuery'>) {
  const data = cache.readQuery({
    query: LOCAL_USER_ID,
  });

  return data?.localUser.id != null;
}
