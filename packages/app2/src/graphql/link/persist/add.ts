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
  const ref = cache.writeQuery({
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

  if (!ref) {
    throw new Error(
      'Expected a reference as result when writing query "AddOngoingOperation"'
    );
  }

  return ref;
}
