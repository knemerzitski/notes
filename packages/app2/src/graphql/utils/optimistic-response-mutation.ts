import {
  ApolloCache,
  DefaultContext,
  FetchResult,
  MutationFunctionOptions,
  OperationVariables,
} from '@apollo/client';

import { IgnoreModifier } from '@apollo/client/cache/core/types/common';
import { GraphQLError } from 'graphql';

const IGNORE: IgnoreModifier = Object.create(null);

export const optimisticResponseMutation = function <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  TVariables = OperationVariables,
  TContext extends DefaultContext = DefaultContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  options?: MutationFunctionOptions<TData, TVariables, TContext, TCache>
): Promise<FetchResult<TData>> {
  if (!options) {
    return Promise.resolve({
      errors: [new GraphQLError('Expected "options" to be defined')],
    });
  }

  const client = options.client;
  if (!client) {
    return Promise.resolve({
      errors: [new GraphQLError('Expected "client" to be defined')],
    });
  }

  const mutation = options.mutation;
  if (!mutation) {
    return Promise.resolve({
      errors: [new GraphQLError('Expected "mutation" to be defined')],
    });
  }

  const { variables, optimisticResponse, context } = options;

  const data =
    typeof optimisticResponse === 'function'
      ? //@ts-expect-error Function is callable
        optimisticResponse(variables, { IGNORE })
      : optimisticResponse;

  if (data === IGNORE) {
    return Promise.resolve({
      data: null,
    });
  }

  client.cache.writeQuery({
    query: mutation,
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

  options.update?.(
    client.cache as TCache,
    {
      data,
    },
    {
      context,
      variables,
    }
  );

  return Promise.resolve({
    data,
  });
};
