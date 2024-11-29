import {
  ApolloLink,
  FetchResult,
  InMemoryCache,
  NextLink,
  Observable,
  Operation,
} from '@apollo/client';
import { isSubscriptionOperation } from '@apollo/client/utilities';

/**
 * Always clears ROOT_SUBSCRIPTION from cache when
 * receiving data from a subscription.
 */
export class ClearRootSubscriptionLink extends ApolloLink {
  override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (!forward) {
      return null;
    }

    if (!isSubscriptionOperation(operation.query)) {
      return forward(operation);
    }

    const context = operation.getContext();
    const cache = context.cache;
    if (!(cache instanceof InMemoryCache)) {
      return forward(operation);
    }

    const observable = forward(operation).map((value) => {
      cache.modify({
        id: 'ROOT_SUBSCRIPTION',
        fields(value, { fieldName, DELETE }) {
          return fieldName === '__typename' ? value : DELETE;
        },
      });
      return value;
    });

    return observable;
  }
}
