import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const HasUserFragment_UserFragment = gql(`
  fragment HasUserFragment_UserFragment on User {
    id
  }  
`);

export function hasUserFragment(
  userId: string,
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  const signedInUser = cache.readFragment({
    fragment: HasUserFragment_UserFragment,
    id: cache.identify({
      __typename: 'User',
      id: userId,
    }),
  });

  return signedInUser != null;
}
