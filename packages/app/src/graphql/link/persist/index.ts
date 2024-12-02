import {
  ApolloLink,
  Operation,
  NextLink,
  Observable,
  FetchResult,
  DefaultContext,
  InMemoryCache,
  ApolloCache,
  DocumentNode,
} from '@apollo/client';
import { addOngoingOperation } from './add';
import { removeOngoingOperations } from './remove';
import { hasOngoingOperation } from './has';
import { isMutationOperation } from '@apollo/client/utilities';
import { DirectiveFlag } from '../../utils/directive-flag';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { nanoid } from 'nanoid';

const PERSIST_DIRECTIVE = 'persist';

const persistDirective = new DirectiveFlag(PERSIST_DIRECTIVE);

export class PersistLink extends ApolloLink {
  private readonly cache;

  /**
   * Operation id or true to generate an id.
   * Id is used to prevent persisting duplicate operations.
   */
  static readonly PERSIST = 'persistId';

  readonly generateId;

  private readonly observableByOperationId = new Map<string, Observable<FetchResult>>();

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
    this.generateId = options?.generateId ?? nanoid;

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

    const hasDirective = persistDirective.has(operation);
    const persist = context[PersistLink.PERSIST] ?? hasDirective;

    if (!persist || !isMutationOperation(operation.query)) {
      // Cannot persist, skip this link
      return forward(operation);
    }

    // Remove @persist directive as server will not recognize it
    if (hasDirective) {
      persistDirective.remove(operation);
    }

    const operationId = typeof persist !== 'string' ? this.generateId() : persist;

    if (typeof persist !== 'string' || !hasOngoingOperation(persist, this.cache)) {
      context[PersistLink.PERSIST] = operationId;
      operation.setContext({
        [PersistLink.PERSIST]: operationId,
      });
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

    // Reuse existing observable until observer unsubscribes
    const existingObservable = this.observableByOperationId.get(operationId);
    if (existingObservable) {
      return existingObservable;
    }

    const observable = forward(operation).map((value) => {
      const hasPersistErrorCode =
        value.errors?.some((error) =>
          this.persistErrorCodes.has(String(error.extensions.code) as GraphQLErrorCode)
        ) ?? false;
      if (!hasPersistErrorCode) {
        // Remove operation from cache only when recevied a response from server that excludes `persistErrorCodes`
        removeOngoingOperations([operationId], this.cache);
      }

      return value;
    });

    return new Observable<FetchResult>((observer) => {
      this.observableByOperationId.set(operationId, observable);
      const sub = observable.subscribe(observer);

      return () => {
        sub.unsubscribe();
        this.observableByOperationId.delete(operationId);
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

export function hasPersistDirective(document: DocumentNode) {
  return persistDirective.has({
    query: document,
  });
}
