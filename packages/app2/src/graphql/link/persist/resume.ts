import { ApolloCache, ApolloClient } from '@apollo/client';
import { getAllOngoingOperations } from './get-all';
import { getOperationKind } from '../../utils/operation-type';
import { OperationTypeNode } from 'graphql';
import { UpdateHandlersByName } from '../../types';

export function resumeOngoingOperations(
  apolloClient: Pick<ApolloClient<unknown>, 'mutate'> & {
    cache: Pick<ApolloCache<unknown>, 'readQuery' | 'evict' | 'identify' | 'modify'>;
  },
  updateHandlerByName: UpdateHandlersByName
) {
  const ongoingOperations = getAllOngoingOperations(apolloClient.cache);

  return ongoingOperations.map(async (op) => {
    const query = JSON.parse(op.query);
    const context = JSON.parse(op.context);

    const kind = getOperationKind(query);
    if (kind !== OperationTypeNode.MUTATION) {
      throw new Error(`Can only resume a mutation but got "${kind}"`);
    }

    return apolloClient.mutate({
      mutation: query,
      variables: JSON.parse(op.variables),
      context: JSON.parse(op.context),
      optimisticResponse: context.optimisticResponse,
      update: updateHandlerByName[op.operationName],
    });
  });
}
