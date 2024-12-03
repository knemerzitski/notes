import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { SignedInUser } from '../../../__generated__/graphql';

const SetUserSessionExpired_Query = gql(`
  query SetUserSessionExpired_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        sessionExpired
      }
    }
  }
`);

// TODO test
export function setUserSessionExpired(
  userId: SignedInUser['id'],
  sessionExpired: boolean,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: SetUserSessionExpired_Query,
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'SignedInUser',
        id: userId,
        local: {
          __typename: 'LocalSignedInUser',
          id: userId,
          sessionExpired,
        },
      },
    },
  });
}
