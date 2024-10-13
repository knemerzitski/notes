/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApolloCache,
  useMutation as apolloUseMutation,
  DefaultContext,
  MutationHookOptions,
  MutationTuple,
  OperationVariables,
} from '@apollo/client';
import { useGetDocumentUpdater } from '../context/get-document-updater';
import { DocumentUpdateDefinition } from '../types';

/**
 * Uses mutation with pre-defined update function.
 */
export function useMutation<
  TData = any,
  TVariables = OperationVariables,
  TContext = DefaultContext,
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  definition: DocumentUpdateDefinition<TData, TVariables, TContext, TCache>,
  options?: Omit<
    MutationHookOptions<NoInfer<TData>, NoInfer<TVariables>, TContext, TCache>,
    'update'
  >
): MutationTuple<TData, TVariables, TContext, TCache> {
  const getDocumentUpdater = useGetDocumentUpdater();

  return apolloUseMutation(definition.document, {
    ...options,
    update: getDocumentUpdater(definition.document) as any,
  });
}
