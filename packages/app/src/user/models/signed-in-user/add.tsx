import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';

const AddUser_Query = gql(`
  query AddUser_Query {
    signedInUsers {
      id
      local {
        id
        sessionExpired
      }
    }
  }
`);

export function addUser(userId: string, cache: Pick<ApolloCache<unknown>, 'writeQuery'>) {
  return cache.writeQuery({
    query: AddUser_Query,
    data: {
      __typename: 'Query',
      signedInUsers: [
        {
          __typename: 'SignedInUser',
          id: userId,
          local: {
            __typename: 'LocalSignedInUser',
            id: userId,
            sessionExpired: false,
          },
        },
      ],
    },
  });
}
