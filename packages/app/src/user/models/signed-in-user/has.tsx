import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const HasUser_Query = gql(`
  query HasUser_Query {
    signedInUsers {
      id
    }
  }
`);

export function hasUser(
  userId: string,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): boolean {
  const data = cache.readQuery({
    query: HasUser_Query,
  });

  return data?.signedInUsers.some((user) => user.id === userId) ?? false;
}
