import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';

const HasLocalUser_Query = gql(`
  query HasLocalUser_Query {
    localUser {
      id
    }
  }
`);

export function hasLocalUser(cache: Pick<ApolloCache<unknown>, 'readQuery'>) {
  const data = cache.readQuery({
    query: HasLocalUser_Query,
  });

  return data?.localUser.id != null;
}
