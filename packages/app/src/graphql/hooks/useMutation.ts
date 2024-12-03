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
  FetchResult,
  MutationFunctionOptions,
  MutationResult,
} from '@apollo/client';

import { useCallback, useMemo } from 'react';

import { useUserId } from '../../user/context/user-id';
import { useGetMutationUpdaterFn } from '../context/get-mutation-updater-fn';
import { hasNoAuthDirective } from '../link/current-user';
import { GlobalOperationVariables } from '../types';
import { MutationDefinition } from '../utils/mutation-definition';
import { optimisticResponseMutation } from '../utils/optimistic-response-mutation';

import { useIsRemoteOperation } from './useIsRemoteOperation';


interface ExtraOptions {
  /**
   * Execute as a local mutation. Data will not be sent to server.
   * Only cache is updated with optimisticResponse.
   * @default false
   */
  local?: boolean;
}

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
  > &
    ExtraOptions
): [
  mutate: (
    options?: MutationFunctionOptions<TData, TVariables, TContext, TCache> & ExtraOptions
  ) => Promise<FetchResult<TData>>,
  result: MutationResult<TData>,
] {
  const client = useApolloClient();
  const getMutationUpdaterFn = useGetMutationUpdaterFn();
  const userId = useUserId(true);

  const isRemoteOperation = useIsRemoteOperation(definition.document);

  // Add hidden variable userId if operation doesn't have directive @noauth
  const extraVariables = useMemo(
    () =>
      hasNoAuthDirective(definition.document)
        ? {}
        : {
            [GlobalOperationVariables.USER_ID]: userId,
          },
    [definition, userId]
  );

  const [remoteMutation, remoteResult] = useApolloMutation<
    TData,
    TVariables,
    TContext,
    TCache
  >(definition.document, {
    ...options,
    variables: {
      ...options?.variables,
      ...extraVariables,
    } as TVariables,
    update: getMutationUpdaterFn(definition.document) as MutationUpdaterFunction<
      TData,
      TVariables,
      TContext,
      TCache
    >,
  });

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
          variables: {
            ...options?.variables,
            ...extraVariables,
          } as TVariables,
        }),
      [client, definition, getMutationUpdaterFn, extraVariables]
    );

  const mutation: (
    options?: MutationFunctionOptions<TData, TVariables, TContext, TCache> & ExtraOptions
  ) => Promise<FetchResult<TData>> = useCallback(
    (options) => {
      if (isRemoteOperation && !options?.local) {
        return remoteMutation(options);
      }
      return localMutation(options);
    },
    [isRemoteOperation, localMutation, remoteMutation]
  );

  return [mutation, remoteResult];
}
