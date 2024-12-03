import {
  ApolloCache,
  ApolloClient,
  DefaultContext,
  MutationUpdaterFunction,
  OperationVariables,
} from '@apollo/client';

import { isMutationOperation } from '@apollo/client/utilities';

import { getAllOngoingOperations } from './get-all';

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const query = JSON.parse(op.query);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const context = JSON.parse(op.context);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const variables = JSON.parse(op.variables);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (!isMutationOperation(query)) {
      throw new Error('Can only resume a mutation');
    }

    if (options?.filterFn) {
      const canProceed = options.filterFn({
        id: op.id,
        query,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        variables,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        context,
      });
      if (!canProceed) {
        return;
      }
    }

    return {
      id: op.id,
      result: await apolloClient.mutate({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        mutation: query,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        variables,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        context,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        optimisticResponse: context.optimisticResponse,
        update: getUpdater(op.operationName),
      }),
    };
  });
}
