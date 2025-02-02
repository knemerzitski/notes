import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';

const GetCurrentUserId_Query = gql(`
  query GetCurrentUserId_Query {
    currentSignedInUser {
      id
    }
  }
`);

export function getCurrentUserId(cache: Pick<ApolloCache<unknown>, 'readQuery'>): string {
  const data = cache.readQuery({
    query: GetCurrentUserId_Query,
  });

  if (!data) {
    throw new Error('Unexpected failed getCurrentUserId');
  }

  return data.currentSignedInUser.id;
}
