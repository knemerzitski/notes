import {
  ApolloCache,
  ApolloClient,
  DefaultContext,
  FetchResult,
  MutationOptions,
  OperationVariables,
} from '@apollo/client';

import { Maybe } from '~utils/types';

import { MutationUpdaterFunctionMap } from '../create/mutation-updater-map';

import { isRemoteOperation } from './is-remote-operation';
import { MutationDefinition } from './mutation-definition';
import { optimisticResponseMutation } from './optimistic-response-mutation';

export function mutate<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
   
  TContext extends DefaultContext = DefaultContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  definition: MutationDefinition<TData, TVariables, TContext, TCache>,
  {
    client,
    getMutationUpdaterFn,
    userId,
    options,
  }: {
    client: ApolloClient<object>;
    getMutationUpdaterFn: MutationUpdaterFunctionMap['get'];
    userId?: Maybe<string>;
    options?: Omit<MutationOptions<TData, TVariables, TContext>, 'mutation'>;
  }
): Promise<FetchResult<TData>> {
  if (
    isRemoteOperation(definition.document, {
      cache: client.cache,
      userId,
    })
  ) {
    return client.mutate({
      update: getMutationUpdaterFn(definition.document),
      ...options,
      mutation: definition.document,
    });
  }

  return optimisticResponseMutation({
    client,
    update: getMutationUpdaterFn(definition.document),
    ...options,
    mutation: definition.document,
  });
}
