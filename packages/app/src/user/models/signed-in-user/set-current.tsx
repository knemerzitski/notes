import { ApolloCache } from '@apollo/client';

import { Maybe } from '../../../../../utils/src/types';

import { gql } from '../../../__generated__';
import { User } from '../../../__generated__/graphql';

const SetCurrentUser_Query = gql(`
  query SetCurrentUser_Query {
    currentSignedInUser {
      id
    }
  }
`);

export function setCurrentUser(
  userId: Maybe<User['id']>,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: SetCurrentUser_Query,
    data: {
      __typename: 'Query',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      currentSignedInUser: userId
        ? {
            __typename: 'User',
            id: userId,
          }
        : // Allow setting currentSignedInUser to null, field policy will guarantee a valid value is returned
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (null as any),
    },
  });
}
