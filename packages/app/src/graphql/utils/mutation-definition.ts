/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  OperationVariables,
  DefaultContext,
  ApolloCache,
  MutationUpdaterFunction,
  DocumentNode,
} from '@apollo/client';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

export interface MutationDefinition<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TVariables = any,
  TContext = DefaultContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCache extends ApolloCache<any> = ApolloCache<any>,
> {
  readonly document: DocumentNode | TypedDocumentNode<TData, TVariables>;
  readonly update?: MutationUpdaterFunction<
    NoInfer<TData>,
    NoInfer<TVariables>,
    TContext,
    TCache
  >;
}

export function mutationDefinition<
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
  TContext = DefaultContext,
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  document: DocumentNode | TypedDocumentNode<TData, TVariables>,
  update?: MutationUpdaterFunction<TData, TVariables, TContext, TCache>
): MutationDefinition<TData, TVariables, TContext, TCache> {
  return { document, update };
}
