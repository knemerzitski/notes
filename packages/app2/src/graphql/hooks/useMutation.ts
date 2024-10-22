/* eslint-disable no-restricted-imports */
import {
  ApolloCache,
  useMutation as useApolloMutation,
  MutationHookOptions,
  MutationTuple,
  OperationVariables,
  useApolloClient,
  MutationUpdaterFunction,
  DefaultContext,
} from '@apollo/client';
import { useGetMutationUpdaterFn } from '../context/get-mutation-updater-fn';
import { useCallback } from 'react';
import { MutationDefinition } from '../utils/mutation-definition';
import { optimisticResponseMutation } from '../utils/optimistic-response-mutation';
import { useIsRemoteOperation } from './useIsRemoteOperation';

/**
 * Uses mutation with pre-defined update function.
 * If current user is localOnly then only optimistic response is written to cache permanently.
 * If user is not local then default mutation function is used.
 */
export function useMutation<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  TVariables = OperationVariables,
  TContext extends DefaultContext = DefaultContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  definition: MutationDefinition<TData, TVariables, TContext, TCache>,
  options?: Omit<
    MutationHookOptions<NoInfer<TData>, NoInfer<TVariables>, TContext, TCache>,
    'update'
  >
): MutationTuple<TData, TVariables, TContext, TCache> {
  const client = useApolloClient();
  const getMutationUpdaterFn = useGetMutationUpdaterFn();

  const isRemoteOperation = useIsRemoteOperation(definition.document);

  const apolloMutationTuple = useApolloMutation<TData, TVariables, TContext, TCache>(
    definition.document,
    {
      ...options,
      update: getMutationUpdaterFn(definition.document) as MutationUpdaterFunction<
        TData,
        TVariables,
        TContext,
        TCache
      >,
    }
  );

  const localMutation: MutationTuple<TData, TVariables, TContext, TCache>[0] =
    useCallback(
      (options) =>
        optimisticResponseMutation({
          client,
          mutation: definition.document,
          update: getMutationUpdaterFn(
            options?.mutation ?? definition.document
          ) as MutationUpdaterFunction<TData, TVariables, TContext, TCache>,
          ...options,
        }),
      [client, definition, getMutationUpdaterFn]
    );

  return isRemoteOperation
    ? apolloMutationTuple
    : [localMutation, apolloMutationTuple[1]];
}
