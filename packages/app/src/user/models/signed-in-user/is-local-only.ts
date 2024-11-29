// eslint-disable-next-line no-restricted-imports
import { ApolloCache } from '@apollo/client';
import { SignedInUser } from '../../../__generated__/graphql';
import { gql } from '../../../__generated__';

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
