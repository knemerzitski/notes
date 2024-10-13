/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  OperationVariables,
  DefaultContext,
  ApolloCache,
  MutationUpdaterFunction,
  DocumentNode,
} from '@apollo/client';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { DocumentUpdateDefinition } from '../types';

export function documentUpdateDefinition<
  TData = any,
  TVariables = OperationVariables,
  TContext = DefaultContext,
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  document: DocumentNode | TypedDocumentNode<TData, TVariables>,
  update?: MutationUpdaterFunction<TData, TVariables, TContext, TCache>
): DocumentUpdateDefinition<TData, TVariables, TContext, TCache> {
  return { document, update };
}
