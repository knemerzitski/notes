import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { User } from '../../../__generated__/graphql';

const SetUserSessionExpiredPromptedToSignIn_Query = gql(`
  query SetUserSessionExpiredPromptedToSignIn_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        sessionExpiredPromptedToSignIn
      }
    }
  }
`);

export function setUserSessionExpiredPromptedToSignIn(
  userId: User['id'],
  sessionExpiredPromptedToSignIn: boolean,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: SetUserSessionExpiredPromptedToSignIn_Query,
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'User',
        id: userId,
        local: {
          __typename: 'LocalUser',
          id: userId,
          sessionExpiredPromptedToSignIn,
        },
      },
    },
  });
}
