import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { ApolloOperation } from '../../../__generated__/graphql';

const ADD_ONGOING_OPERATION = gql(`
  query AddOngoingOperation {
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
  operation: ApolloOperation,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: ADD_ONGOING_OPERATION,
    data: {
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
