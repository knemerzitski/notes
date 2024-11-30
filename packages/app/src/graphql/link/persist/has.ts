import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { ApolloOperation } from '../../../__generated__/graphql';

const HasOngoingOperation_Query = gql(`
  query HasOngoingOperation_Query($id: ID!) {
    ongoingOperation(id: $id) {
      id
    }
  }
`);

export function hasOngoingOperation(
  id: ApolloOperation['id'],
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: HasOngoingOperation_Query,
    variables: {
      id,
    },
  });

  return data?.ongoingOperation?.id != null;
}
