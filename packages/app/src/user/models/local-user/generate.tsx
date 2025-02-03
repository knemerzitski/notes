import { ApolloCache } from '@apollo/client';

import { WriteLocalUserQueryQuery } from '../../../__generated__/graphql';

import { generateSignedInUserId } from './generate-id';

export function generateLocalUser(
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  const id = generateSignedInUserId(cache);
  return {
    __typename: 'User',
    id,
    profile: {
      __typename: 'UserProfile',
      displayName: 'Local Account',
    },
    local: {
      __typename: 'LocalSignedInUser',
      id,
    },
  } satisfies WriteLocalUserQueryQuery['localUser'];
}
