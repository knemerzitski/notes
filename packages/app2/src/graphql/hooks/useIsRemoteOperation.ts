import { DocumentNode, useQuery } from '@apollo/client';
import { useUserId } from '../../user/context/user-id';
import { gql } from '../../__generated__';
import { isRemoteOperation } from '../utils/is-remote-operation';

const UseIsRemoteOperation_Query = gql(`
  query UseIsRemoteOperation_Query($id: ID) {
    signedInUserById(id: $id) @client {
      localOnly
    }
  }
`);

/**
 * @returns Given document only meant for server usage
 */
export function useIsRemoteOperation(document: DocumentNode) {
  const userId = useUserId(true);
  const { data } = useQuery(UseIsRemoteOperation_Query, {
    variables: {
      id: userId,
    },
  });

  return isRemoteOperation(document, data?.signedInUserById?.localOnly);
}
