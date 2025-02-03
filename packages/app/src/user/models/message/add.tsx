import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { AddUserMessagesQueryQuery, User } from '../../../__generated__/graphql';

const AddUserMessages_Query = gql(`
  query AddUserMessages_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        messages {
          __typename
          id
          type
          text
        }
      }
    }
  }
`);

export function addUserMessages(
  userId: User['id'],
  messages: Omit<
    NonNullable<AddUserMessagesQueryQuery['signedInUser']>['local']['messages'][0],
    '__typename'
  >[],
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  return cache.writeQuery({
    query: AddUserMessages_Query,
    variables: {
      id: userId,
    },
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'User',
        id: userId,
        local: {
          id: userId,
          __typename: 'LocalSignedInUser',
          messages: messages.map((message) => ({
            ...message,
            __typename: 'UserMessage' as const,
          })),
        },
      },
    },
  });
}
