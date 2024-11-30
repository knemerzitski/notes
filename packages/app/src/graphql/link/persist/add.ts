import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { ApolloOperation } from '../../../__generated__/graphql';

const AddOngoingOperation_Query = gql(`
  query AddOngoingOperation_Query {
    ongoingOperations {
      id
      operationName
      query
      variables
      context
    }
  }
`);

export function addOngoingOperation(
  operation: Omit<ApolloOperation, '__typename'>,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: AddOngoingOperation_Query,
    data: {
      __typename: 'Query',
      ongoingOperations: [
        {
          __typename: 'ApolloOperation',
          ...operation,
        },
      ],
    },
  });

  return operation;
}
