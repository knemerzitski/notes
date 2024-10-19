import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { AddUserMessagesQueryQuery, SignedInUser } from '../../../__generated__/graphql';

const AddUserMessages_Query = gql(`
  query AddUserMessages_Query {
    signedInUserById {
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
  userId: SignedInUser['id'],
  messages: Omit<
    NonNullable<AddUserMessagesQueryQuery['signedInUserById']>['local']['messages'][0],
    '__typename'
  >[],
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  return cache.writeQuery({
    query: AddUserMessages_Query,
    data: {
      __typename: 'Query',
      signedInUserById: {
        __typename: 'SignedInUser',
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
