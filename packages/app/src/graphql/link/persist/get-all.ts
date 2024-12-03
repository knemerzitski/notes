import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const GetAllOngoingOperations_Query = gql(`
  query GetAllOngoingOperations_Query {
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
    query: GetAllOngoingOperations_Query,
  });
  if (!data) return [];

  return data.ongoingOperations;
}
