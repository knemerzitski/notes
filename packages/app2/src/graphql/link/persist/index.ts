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
import { addOngoingOperation } from './add';
import { removeOngoingOperation } from './remove';
import { isMutation } from '../../utils/operation-type';
import { hasOngoingOperation } from './has';
import { CountMap } from '~utils/count-map';

export class PersistLink extends ApolloLink {
  private readonly cache;

  static PERSIST = '_PersistLink-persist';

  readonly generateId;

  private readonly ongoingCountMap = new CountMap<string>();

  constructor(cache: InMemoryCache, options?: { generateId: () => string }) {
    super();
    this.cache = cache;
    this.generateId = options?.generateId ?? crypto.randomUUID.bind(crypto);
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
      // Cannot persist, skip this link
      return forward(operation);
    }

    const operationId = typeof persist !== 'string' ? this.generateId() : persist;

    if (this.ongoingCountMap.get(operationId) > 0) {
      // Operation with same id is already ongoing, cancel this one
      return null;
    }

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

    return new Observable((observer) => {
      this.ongoingCountMap.inc(operationId);

      const sub = forward(operation)
        .map((value) => {
          // Remove operation from cache only when recevied a response from server
          removeOngoingOperation(operationId, this.cache);
          return value;
        })
        .subscribe(observer);

      return () => {
        this.ongoingCountMap.dec(operationId);
        sub.unsubscribe();
      };
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
