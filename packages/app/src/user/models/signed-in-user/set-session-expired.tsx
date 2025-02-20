import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { User } from '../../../__generated__/graphql';

const SetUserSessionExpired_Query = gql(`
  query SetUserSessionExpired_Query($id: ObjectID!) {
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
  userId: User['id'],
  sessionExpired: boolean,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: SetUserSessionExpired_Query,
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'User',
        id: userId,
        local: {
          __typename: 'LocalUser',
          id: userId,
          sessionExpired,
        },
      },
    },
  });
}
