import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const HasUserFragment_SignedInUserFragment = gql(`
  fragment HasUserFragment_SignedInUserFragment on SignedInUser {
    id
  }  
`);

export function hasUserFragment(
  userId: string,
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  const signedInUser = cache.readFragment({
    fragment: HasUserFragment_SignedInUserFragment,
    id: cache.identify({
      __typename: 'SignedInUser',
      id: userId,
    }),
  });

  return signedInUser != null;
}
