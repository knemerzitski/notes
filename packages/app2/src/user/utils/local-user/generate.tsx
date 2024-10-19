import { WriteLocalUserQueryQuery } from '../../../__generated__/graphql';
import { generateSignedInUserId } from '../signed-in-user/generate-id';
import { ApolloCache } from '@apollo/client';

export function generateLocalUser(
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  const id = generateSignedInUserId(cache);
  return {
    __typename: 'SignedInUser',
    id,
    localOnly: true,
    public: {
      __typename: 'PublicUser',
      id,
      profile: {
        __typename: 'PublicUserProfile',
        displayName: 'Local Account',
      },
    },
    local: {
      __typename: 'LocalSignedInUser',
      id,
    },
  } satisfies WriteLocalUserQueryQuery['localUser'];
}
