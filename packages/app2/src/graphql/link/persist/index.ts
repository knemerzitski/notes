import {
  ApolloLink,
  Operation,
  NextLink,
  Observable,
  FetchResult,
  DefaultContext,
  InMemoryCache,
  ApolloCache,
} from '@apollo/client';
import { randomUUID } from 'crypto';
import { addOngoingOperation } from './add';
import { removeOngoingOperation } from './remove';

export class PersistLink extends ApolloLink {
  private readonly cache;

  static PERSIST = '_PersistLink-persist';

  constructor(cache: InMemoryCache) {
    super();
    this.cache = cache;
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    const context = operation.getContext();

    if (!context[PersistLink.PERSIST]) {
      return forward(operation);
    }

    const ref = addOngoingOperation(
      {
        id: randomUUID(),
        operationName: operation.operationName,
        query: JSON.stringify(operation.query),
        variables: JSON.stringify(operation.variables),
        context: JSON.stringify(contextNoCache(context)),
      },
      this.cache
    );

    return forward(operation).map((value) => {
      removeOngoingOperation(ref, this.cache);
      return value;
    });
  }
}

function contextNoCache(context: DefaultContext) {
  if (context.cache instanceof ApolloCache) {
    const { cache, ...rest } = context;
    return rest;
  }
  return context;
}
