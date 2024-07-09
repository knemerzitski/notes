import {
  ApolloClient,
  DataProxy,
  HttpLink,
  HttpOptions,
  InMemoryCache,
  NormalizedCacheObject,
  TypePolicies,
  split,
  empty,
  ApolloLink,
  ApolloCache,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { Reference, getMainDefinition } from '@apollo/client/utilities';
import { CachePersistor } from 'apollo3-cache-persist';
import { Kind, OperationTypeNode } from 'graphql';
import { createClient, MessageType, ConnectionInitMessage } from 'graphql-ws';

import { CustomHeaderName } from '~api-app-shared/custom-headers';

import { getCurrentUserId, withDifferentUserIdInStorage } from '../auth/user';

import { KeySpecifierName } from './key-specifier';
import ErrorLink from './links/error-link';
import StatsLink from './links/stats-link';
import TypeLink, { LinkTypePolicies } from './links/type-link';
import WaitLink from './links/wait-link';
import {
  EvictByTagOptions,
  EvictOptions,
  EvictTag,
  EvictTypePolicies,
  GarbageCollectionOptions,
  TypePoliciesEvictor as TypePoliciesEvictor,
} from './policy/evict';
import { PersistTypePolicies } from './policy/persist';

type AllTypePolicies = TypePolicies &
  PersistTypePolicies &
  EvictTypePolicies<NormalizedCacheObject> &
  LinkTypePolicies<NormalizedCacheObject>;

export interface CustomApolloClientParams {
  persistor: CachePersistor<NormalizedCacheObject>;
  cache: InMemoryCache;
  typePolicies: AllTypePolicies;
  httpLinkOptions?: HttpOptions;
  wsClientOptions?: Parameters<typeof createClient>[0];
  currentUserIdStorage?: Storage;
  link?: ApolloLink;
}

export class CustomApolloClient {
  readonly client: ApolloClient<NormalizedCacheObject>;
  readonly persistor: CachePersistor<NormalizedCacheObject>;
  readonly evictor: TypePoliciesEvictor<NormalizedCacheObject>;
  readonly cache: InMemoryCache;

  readonly statsLink: StatsLink;
  readonly errorLink: ErrorLink;

  private readonly currentUserIdStorage;

  restartSubscriptionClient: () => void;
  private restartRequested;

  constructor({
    cache,
    persistor,
    typePolicies,
    httpLinkOptions,
    wsClientOptions,
    currentUserIdStorage,
    link,
  }: CustomApolloClientParams) {
    this.currentUserIdStorage = currentUserIdStorage;
    this.cache = cache;
    this.persistor = persistor;

    this.evictor = new TypePoliciesEvictor({
      cache,
      typePolicies,
    });

    const typeLink = new TypeLink({
      typePolicies,
    });

    const httpLink = new HttpLink(httpLinkOptions);

    const authLink = setContext((_request, previousContext) => {
      const currentUserId = getCurrentUserId(cache);
      if (!currentUserId) return previousContext;
      return {
        ...previousContext,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: {
          ...previousContext.headers,
          [CustomHeaderName.UserId]: currentUserId,
        },
      };
    });

    // Send connection id with each http request to prevent receiving subscription updates from self
    let wsConnectionId: string | null = null;
    const addWsConnectionIdLink = setContext((_request, previousContext) => {
      if (!wsConnectionId) return previousContext;
      return {
        ...previousContext,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: {
          ...previousContext.headers,
          [CustomHeaderName.WsConnectionId]: wsConnectionId,
        },
      };
    });

    this.restartRequested = false;
    this.restartSubscriptionClient = () => {
      wsClient?.terminate();
      this.restartRequested = true;
    };

    const wsClient = wsClientOptions
      ? createClient({
          lazy: false,
          retryAttempts: Infinity,
          connectionParams() {
            // Send authentication in connection init
            const currentUserId = getCurrentUserId(cache);
            if (!currentUserId) return;

            const payload: ConnectionInitMessage['payload'] = {
              headers: {
                [CustomHeaderName.UserId]: currentUserId,
              },
            };

            return payload;
          },
          on: {
            connected: (socket) => {
              if (socket instanceof WebSocket) {
                this.restartSubscriptionClient = () => {
                  if (socket.readyState === WebSocket.OPEN) {
                    socket.close(4499, 'Terminated');
                  }
                };

                if (this.restartRequested) {
                  this.restartRequested = false;
                  this.restartSubscriptionClient();
                }
              }
            },
            message: (message) => {
              if (message.type === MessageType.ConnectionAck) {
                const payload = message.payload;
                if (payload) {
                  if ('connectionId' in payload) {
                    const connectionId = payload.connectionId;
                    if (typeof connectionId === 'string' && connectionId.length > 0) {
                      wsConnectionId = connectionId;
                    }
                  }
                }
              }
            },
            closed: () => {
              wsConnectionId = null;
            },
          },
          ...wsClientOptions,
        })
      : null;

    const wsLink = wsClient ? new GraphQLWsLink(wsClient) : empty();

    const httpWsSplitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === Kind.OPERATION_DEFINITION &&
          definition.operation === OperationTypeNode.SUBSCRIPTION
        );
      },
      wsLink,
      addWsConnectionIdLink.concat(authLink).concat(httpLink)
    );

    const statsLink = new StatsLink();
    const errorLink = new ErrorLink();

    const waitLink = new WaitLink({
      waitTime: 0,
    });

    const apolloClient = new ApolloClient({
      link:
        link ??
        typeLink
          .concat(statsLink)
          .concat(waitLink)
          .concat(errorLink)
          .concat(httpWsSplitLink),
      cache,
    });

    this.client = apolloClient;

    this.statsLink = statsLink;
    this.errorLink = errorLink;
  }

  /**
   * Write fragment without retaining ID as reachable root ID.
   * Written data could be garbage collected.
   */
  writeFragmentNoRetain<TData = unknown, TVariables = unknown>(
    {
      id,
      data,
      fragment,
      fragmentName,
      ...restOptions
    }: DataProxy.WriteFragmentOptions<TData, TVariables>,
    options?: {
      cache?: ApolloCache<unknown>;
    }
  ): Reference | undefined {
    const cache =
      options?.cache && options.cache instanceof InMemoryCache
        ? options.cache
        : this.cache;

    const result = cache.writeFragment({
      id,
      data,
      fragment,
      fragmentName,
      ...restOptions,
    });
    if (id) {
      cache.release(id);
    }
    return result;
  }

  evictUserSpecific(
    userId: string | undefined,
    options?: EvictByTagOptions<NormalizedCacheObject>
  ) {
    withDifferentUserIdInStorage(
      userId,
      () => {
        const args: Record<string, unknown[]> = userId
          ? {
              [KeySpecifierName.UserId]: [userId],
            }
          : {};

        this.evictor.evictByTag({
          cache: this.client.cache,
          tag: EvictTag.UserSpecific,
          ...options,
          args: {
            ...args,
            ...options?.args,
          },
        });
      },
      this.currentUserIdStorage
    );
  }

  /**
   * Calls evicted in typePolicy
   */
  evict(options: EvictOptions<NormalizedCacheObject>) {
    return this.evictor.evict(options);
  }

  /**
   * Calls evicted in typePolicy
   */
  gc(options?: GarbageCollectionOptions<NormalizedCacheObject>) {
    return this.evictor.gc(options);
  }
}
