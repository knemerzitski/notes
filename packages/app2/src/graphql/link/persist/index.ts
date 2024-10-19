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
import { hasOngoingOperation } from './has';
import { CountMap } from '~utils/map/count-map';
import { isMutationOperation } from '@apollo/client/utilities';
import { DirectiveFlag } from '../../utils/directive-flag';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

const PERSIST_DIRECTIVE = 'persist';

export class PersistLink extends ApolloLink {
  private readonly cache;

  static readonly PERSIST = '_PersistLink-persist';

  readonly generateId;

  private readonly ongoingCountMap = new CountMap<string>(new Map());

  private readonly persistDirective;

  private readonly persistErrorCodes: Set<GraphQLErrorCode>;

  constructor(
    cache: InMemoryCache,
    options?: {
      generateId?: () => string;
      /**
       * If operation response contains error with `{extensions: {code: GraphQLErrorCode}}`
       * then operation is persisted.
       */
      persistErrorCodes?: GraphQLErrorCode[];
    }
  ) {
    super();
    this.cache = cache;
    this.generateId = options?.generateId ?? crypto.randomUUID.bind(crypto);

    this.persistDirective = new DirectiveFlag(PERSIST_DIRECTIVE);

    this.persistErrorCodes = new Set(options?.persistErrorCodes);
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    const context = operation.getContext();

    const hasDirective = this.persistDirective.has(operation);
    const persist = context[PersistLink.PERSIST] || hasDirective;

    if (!persist || !isMutationOperation(operation.query)) {
      // Cannot persist, skip this link
      return forward(operation);
    }

    if (hasDirective) {
      this.persistDirective.remove(operation);
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
      this.ongoingCountMap.increment(operationId);

      const sub = forward(operation)
        .map((value) => {
          const hasPersistErrorCode =
            value.errors?.some((error) =>
              this.persistErrorCodes.has(
                String(error.extensions.code) as GraphQLErrorCode
              )
            ) ?? false;
          if (!hasPersistErrorCode) {
            // Remove operation from cache only when recevied a response from server that excludes `persistErrorCodes`
            removeOngoingOperation(operationId, this.cache);
          }

          return value;
        })
        .subscribe(observer);

      return () => {
        this.ongoingCountMap.decrement(operationId);
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
