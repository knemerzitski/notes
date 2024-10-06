/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  OperationVariables,
  DefaultContext,
  ApolloCache,
  MutationUpdaterFunction,
  DocumentNode,
} from '@apollo/client';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { MutationOperation } from '../types';

export function createMutationOperation<
  TData = any,
  TVariables = OperationVariables,
  TContext = DefaultContext,
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>,
  update: MutationUpdaterFunction<TData, TVariables, TContext, TCache>
): MutationOperation<true, TData, TVariables, TContext, TCache>;
export function createMutationOperation<
  TData = any,
  TVariables = OperationVariables,
  TContext = DefaultContext,
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>
): MutationOperation<false, TData, TVariables, TContext, TCache>;
export function createMutationOperation<
  TData = any,
  TVariables = OperationVariables,
  TContext = DefaultContext,
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>,
  update?: MutationUpdaterFunction<TData, TVariables, TContext, TCache>
): MutationOperation<any, TData, TVariables, TContext, TCache> {
  return {
    mutation,
    update,
  };
}
