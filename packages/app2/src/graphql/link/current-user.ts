import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  GraphQLRequest,
} from '@apollo/client';
import {
  hasDirectives,
  isSubscriptionOperation,
  Observable,
  Observer,
} from '@apollo/client/utilities';
import { AppContext, GlobalOperationVariables } from '../types';
import { isLocalId } from '../../utils/is-local-id';
import { WebSocketClient } from '../ws/websocket-client';
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { Maybe } from '~utils/types';
import SerializingLink from 'apollo-link-serialize';

const SERIALIZE_DIRECTIVE = 'serialize';

/**
 * Check and mark operations based on current user.
 * Prevent operations that do not match current user id or has an invalid user id.
 */
export class CurrentUserLink extends ApolloLink {
  constructor(
    private readonly appContext: Pick<AppContext, 'userId'>,
    private readonly wsClient?: Pick<WebSocketClient, 'asyncUserId'>
  ) {
    super();
  }

  private async validateMarkOperation(operation: Operation) {
    // TODO what if session is expired?

    const userId = this.appContext.userId;
    if (this.wsClient && isSubscriptionOperation(operation.query)) {
      const wsUserId = await this.wsClient.asyncUserId();
      if (wsUserId !== userId) {
        return new Error(
          `Prevented a subscription on WebSocket that does not ` +
            `belong to current user. Current User: "${userId}", WebSocket User: ${wsUserId}`
        );
      }
    }

    const existingUserId = getOperationOrRequestUserId(operation);
    if (existingUserId) {
      // Operation is already marked with an user, can proceed
      return;
    }

    setOperationUserId(operation, userId);

    return;
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    const cache = new Map<
      Observer<FetchResult>,
      ReturnType<Observable<FetchResult>['subscribe']> | undefined
    >();

    let observable: Observable<FetchResult> | null = null;
    void this.validateMarkOperation(operation).then((result) => {
      if (result instanceof Error) {
        observable = new Observable((observer) => {
          observer.error(result);
        });
      } else {
        observable = forward(operation);
      }

      for (const observer of cache.keys()) {
        if (!cache.get(observer)) {
          cache.set(observer, observable.subscribe(observer));
        }
      }
    });

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      cache.set(observer, observable?.subscribe(observer));
      return () => {
        cache.get(observer)?.unsubscribe();
        cache.delete(observer);
      };
    });
  }
}

/**
 * Mark operation with userId
 * Using variables instead of context
 * USER_ID variable can be used in Query field keyArgs to separate same query for each user
 */
function setOperationUserId(operation: Operation, userId: Maybe<string>) {
  if (!userId) {
    return;
  }

  if (!isLocalId(userId)) {
    operation.variables = {
      ...operation.variables,
      [GlobalOperationVariables.USER_ID]: userId,
    };
  }

  // If document has @serialize directive then add userId to separate seriaization per user
  if (hasDirectives([SERIALIZE_DIRECTIVE], operation.query)) {
    operation.setContext((prev: unknown) => ({
      ...(isObjectLike(prev) ? prev : {}),
      [SerializingLink.SERIALIZE_DIRECTIVE]: `userId:${userId}`,
    }));
  }
}

export function getOperationOrRequestUserId(
  operation: Pick<Operation, 'variables'> | Pick<GraphQLRequest, 'variables'>
) {
  const userId = operation.variables?.[GlobalOperationVariables.USER_ID];
  if (typeof userId === 'string') {
    return userId;
  }
  return;
}
