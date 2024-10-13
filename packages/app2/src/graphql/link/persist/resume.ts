import {
  ApolloCache,
  ApolloClient,
  DefaultContext,
  MutationUpdaterFunction,
  OperationVariables,
} from '@apollo/client';
import { getAllOngoingOperations } from './get-all';
import { OperationTypeNode } from 'graphql';
import { getOperationKind } from '../../utils/document/get-operation-kind';

export function resumeOngoingOperations(
  apolloClient: Pick<ApolloClient<unknown>, 'mutate'> & {
    cache: Pick<ApolloCache<unknown>, 'readQuery' | 'evict' | 'identify' | 'modify'>;
  },
  getUpdater: (name: string) =>
    | MutationUpdaterFunction<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any,
        OperationVariables,
        DefaultContext,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ApolloCache<any>
      >
    | undefined
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
      update: getUpdater(op.operationName),
    });
  });
}
