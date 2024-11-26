import {
  DocumentTransform,
  OperationVariables,
  ApolloClient,
  SubscriptionOptions,
  FetchResult,
} from '@apollo/client';
import { visit, OperationTypeNode } from 'graphql';
import { Observable } from 'zen-observable-ts';

const transformToQueryOperation = new DocumentTransform((document) => {
  return visit(document, {
    OperationDefinition(operationDefinition) {
      if (operationDefinition.operation === OperationTypeNode.QUERY) {
        return;
      }
      return {
        ...operationDefinition,
        operation: OperationTypeNode.QUERY,
      };
    },
  });
});

/**
 * Uses value from cache which has been processed by type policies.
 * Useful for getting subscription data with transformed scalars.
 */
export function apolloClientSubscribe<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = any,
  TVariables extends OperationVariables = OperationVariables,
>(
  client: ApolloClient<unknown>,
  options: SubscriptionOptions<TVariables, T>
): Observable<FetchResult<T>> {
  const observable = client.subscribe(options);

  return observable.map((value) => {
    return {
      ...value,
      data: client.cache.read({
        query: transformToQueryOperation.transformDocument(options.query),
        rootId: 'ROOT_SUBSCRIPTION',
        variables: options.variables,
        optimistic: false,
      }),
    };
  });
}
