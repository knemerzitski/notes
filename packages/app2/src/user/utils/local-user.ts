import { ApolloCache } from '@apollo/client';
import { gql } from '../../__generated__';
import { generateSignedInUserId } from './generate-signed-in-user-id';
import { SignedInUser } from '../../__generated__/graphql';

const INITIALIZE_LOCAL_USER = gql(`
  query InitializeLocalUser {
    localUser {
      __typename
      id
      localOnly
    }
  }
`);

/**
 * Generates a local SignedInUser and writes it to cache
 */
export function initializeWriteLocalUser(
  cache: Pick<ApolloCache<unknown>, 'writeQuery' | 'readFragment' | 'identify'>
) {
  const localUser = {
    __typename: 'SignedInUser',
    id: generateSignedInUserId(cache),
    localOnly: true,
  } satisfies Pick<SignedInUser, '__typename' | 'id' | 'localOnly'>;

  cache.writeQuery({
    query: INITIALIZE_LOCAL_USER,
    data: {
      localUser,
    },
  });

  return localUser;
}
