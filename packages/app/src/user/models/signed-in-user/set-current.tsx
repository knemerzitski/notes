import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { Maybe } from '~utils/types';
import { SignedInUser } from '../../../__generated__/graphql';

const SetCurrentUser_Query = gql(`
  query SetCurrentUser_Query {
    currentSignedInUser {
      id
    }
  }
`);

export function setCurrentUser(
  userId: Maybe<SignedInUser['id']>,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  // TODO reload queries, need client for that?
  cache.writeQuery({
    query: SetCurrentUser_Query,
    data: {
      __typename: 'Query',
      currentSignedInUser: userId
        ? {
            __typename: 'SignedInUser',
            id: userId,
          }
        : // Allow setting currentSignedInUser to null, field policy will guarantee a valid value
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (null as any),
    },
  });
}
