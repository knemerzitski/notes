import {
  ApolloCache,
  ApolloClient,
  DefaultContext,
  MutationUpdaterFunction,
  OperationVariables,
} from '@apollo/client';
import { getAllOngoingOperations } from './get-all';
import { isMutationOperation } from '@apollo/client/utilities';

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
    | undefined,
  options?: {
    /**
     * Filter for deciding which operations to resume
     */
    filterFn?: (operation: {
      id: string;
      query: unknown;
      variables: OperationVariables;
      context: DefaultContext;
    }) => boolean;
  }
) {
  const ongoingOperations = getAllOngoingOperations(apolloClient.cache);

  return ongoingOperations.map(async (op) => {
    const query = JSON.parse(op.query);
    const context = JSON.parse(op.context);
    const variables = JSON.parse(op.variables);

    if (!isMutationOperation(query)) {
      throw new Error('Can only resume a mutation');
    }

    if (options?.filterFn) {
      const canProceed = options.filterFn({
        id: op.id,
        query,
        variables,
        context,
      });
      if (!canProceed) {
        return;
      }
    }

    return {
      id: op.id,
      result: await apolloClient.mutate({
        mutation: query,
        variables,
        context,
        optimisticResponse: context.optimisticResponse,
        update: getUpdater(op.operationName),
      }),
    };
  });
}
