/* eslint-disable no-restricted-imports */
import {
  ApolloCache,
  useMutation as useApolloMutation,
  DefaultContext,
  MutationHookOptions,
  MutationTuple,
  OperationVariables,
  useQuery,
  useApolloClient,
  MutationUpdaterFunction,
} from '@apollo/client';
import { useGetDocumentUpdater } from '../context/get-document-updater';
import { DocumentUpdateDefinition } from '../types';
import { useCallback } from 'react';
import { gql } from '../../__generated__';
import { IgnoreModifier } from '@apollo/client/cache/core/types/common';
import { useUserId } from '../../user/context/user-id';

const UseMutation_Query = gql(`
  query UseMutation_Query($id: ID) {
    signedInUserById(id: $id) @client {
      localOnly
    }
  }
`);

const IGNORE: IgnoreModifier = Object.create(null);

/**
 * Uses mutation with pre-defined update function.
 * If current user is localOnly then only optimistic response is written to cache permanently.
 * If user is not local then default mutation function is used.
 */
export function useMutation<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  TVariables = OperationVariables,
  TContext = DefaultContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  definition: DocumentUpdateDefinition<TData, TVariables, TContext, TCache>,
  options?: Omit<
    MutationHookOptions<NoInfer<TData>, NoInfer<TVariables>, TContext, TCache>,
    'update'
  >
): MutationTuple<TData, TVariables, TContext, TCache> {
  const client = useApolloClient();
  const getDocumentUpdater = useGetDocumentUpdater();

  const userId = useUserId(true);
  const { data } = useQuery(UseMutation_Query, {
    variables: {
      id: userId,
    },
  });

  const localOnly = data?.signedInUserById?.localOnly ?? false;

  const update = getDocumentUpdater(definition.document) as
    | MutationUpdaterFunction<TData, TVariables, TContext, TCache>
    | undefined;

  const apolloMutationTuple = useApolloMutation<TData, TVariables, TContext, TCache>(
    definition.document,
    {
      ...options,
      update,
    }
  );

  const localMutation: MutationTuple<TData, TVariables, TContext, TCache>[0] =
    useCallback(
      (options) => {
        if (!options) {
          return false;
        }

        const { variables, optimisticResponse, context } = options;

        const data =
          typeof optimisticResponse === 'function'
            ? //@ts-expect-error Function is callable
              optimisticResponse(variables, { IGNORE })
            : optimisticResponse;

        if (data === IGNORE) {
          return false;
        }

        client.cache.writeQuery({
          query: definition.document,
          variables,
          id: 'ROOT_MUTATION',
          data,
        });

        if (!options.keepRootFields) {
          client.cache.modify({
            id: 'ROOT_MUTATION',
            fields(value, { fieldName, DELETE }) {
              return fieldName === '__typename' ? value : DELETE;
            },
          });
        }

        (options.update ?? update)?.(
          client.cache as TCache,
          {
            data,
          },
          {
            context,
            variables,
          }
        );

        return data;
      },
      [client, definition, update]
    );

  return localOnly ? [localMutation, apolloMutationTuple[1]] : apolloMutationTuple;
}
