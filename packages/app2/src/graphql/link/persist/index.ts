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
import { isMutation } from '../../utils/operation-type';
import { hasOngoingOperation } from './has';

export class PersistLink extends ApolloLink {
  private readonly cache;

  static PERSIST = '_PersistLink-persist';

  private readonly generateId;

  constructor(cache: InMemoryCache, options?: { generateId: () => string }) {
    super();
    this.cache = cache;
    this.generateId = options?.generateId ?? randomUUID;
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    const context = operation.getContext();

    const persist = context[PersistLink.PERSIST];

    if (!persist || !isMutation(operation.query)) {
      return forward(operation);
    }

    const operationId = typeof persist !== 'string' ? this.generateId() : persist;
    if (typeof persist !== 'string' || !hasOngoingOperation(persist, this.cache)) {
      context[PersistLink.PERSIST] = operationId;
      addOngoingOperation(
        {
          id: operationId,
          context: JSON.stringify(contextNoCache(context)),
          operationName: operation.operationName,
          query: JSON.stringify(operation.query),
          variables: JSON.stringify(operation.variables),
        },
        this.cache
      );
    }

    return forward(operation).map((value) => {
      removeOngoingOperation(operationId, this.cache);
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
