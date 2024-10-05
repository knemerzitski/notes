import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';

const GET_ALL_ONGOING_OPERATIONS = gql(`
  query GetAllOngoingOperations {
    ongoingOperations {
      id
      operationName
      query
      variables
      context
    }
  }
`);

export function getAllOngoingOperations(cache: Pick<ApolloCache<unknown>, 'readQuery'>) {
  const data = cache.readQuery({
    query: GET_ALL_ONGOING_OPERATIONS,
  });
  if (!data) return [];

  return data.ongoingOperations;
}
