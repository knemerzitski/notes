import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const GetUserIds_Query = gql(`
  query GetUserIds_Query {
    signedInUsers {
      id
    }
  }
`);

export function getUserIds(cache: Pick<ApolloCache<unknown>, 'readQuery'>) {
  const data = cache.readQuery({
    query: GetUserIds_Query,
  });

  return data?.signedInUsers.map((user) => user.id) ?? [];
}
