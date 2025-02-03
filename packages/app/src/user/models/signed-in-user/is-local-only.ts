import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { User } from '../../../__generated__/graphql';

const IsLocalOnlyUser_Query = gql(`
  query IsLocalOnlyUser_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      localOnly
    }
  }
`);

export function isLocalOnlyUser(
  userId: User['id'],
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: IsLocalOnlyUser_Query,
    variables: {
      id: userId,
    },
  });

  return data?.signedInUser.localOnly ?? false;
}
