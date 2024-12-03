import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { SignedInUser } from '../../../__generated__/graphql';

const IsLocalOnlyUser_Query = gql(`
  query IsLocalOnlyUser_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      localOnly
    }
  }
`);

export function isLocalOnlyUser(
  userId: SignedInUser['id'],
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: IsLocalOnlyUser_Query,
    variables: {
      id: userId,
    },
  });

  return data?.signedInUser?.localOnly ?? false;
}
