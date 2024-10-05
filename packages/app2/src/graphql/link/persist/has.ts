import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { ApolloOperation } from '../../../__generated__/graphql';

const HAS_ONGOING_OPERATION = gql(`
  query HasOngoingOperation($id: ID!) {
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
    query: HAS_ONGOING_OPERATION,
    variables: {
      id,
    },
  });

  return data?.ongoingOperation?.id != null;
}
