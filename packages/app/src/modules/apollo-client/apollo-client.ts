import {
  ApolloClient,
  DataProxy,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  split,
} from '@apollo/client';
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { Reference, getMainDefinition } from '@apollo/client/utilities';
import { Kind, OperationTypeNode } from 'graphql';
import { createClient, MessageType, ConnectionInitMessage } from 'graphql-ws';
import { CachePersistor } from 'apollo3-cache-persist';
import { CustomHeaderName } from '~api-app-shared/custom-headers';

import ErrorLink from './links/error-link';
import StatsLink from './links/stats-link';
import WaitLink from './links/wait-link';
import { typePolicies } from './policies';
import { TypePersistentStorage } from './policy/persist';
import {
  EvictOptions,
  EvictTag,
  TypePoliciesEvictor as TypePoliciesEvictor,
} from './policy/evict';
import { LocalStoragePrefix, localStorageKey } from '../storage/local-storage';
import { getCurrentUserId, withDifferentUserIdInStorage } from '../auth/user';
import { KeyArguments } from './key-args';
import TypeLink from './links/type-link';

let HTTP_URL: string;
let WS_URL: string;
if (import.meta.env.MODE === 'production') {
  HTTP_URL = import.meta.env.VITE_GRAPHQL_HTTP_URL;
  WS_URL = import.meta.env.VITE_GRAPHQL_WS_URL;
} else {
  HTTP_URL = `${location.origin}/graphql`;
  WS_URL = `ws://${location.host}/graphql-ws`;

  loadDevMessages();
  loadErrorMessages();
}

const cache = new InMemoryCache({
  typePolicies,
});

const persistor = new CachePersistor({
  cache,
  key: localStorageKey(LocalStoragePrefix.Apollo, 'cache'),
  storage: new TypePersistentStorage({
    storage: window.localStorage,
    serialize: (value) => JSON.stringify(value),
    typePolicies,
  }),
});

await persistor.restore();

interface CustomApolloClientParams {
  persistor: CachePersistor<NormalizedCacheObject>;
  cache: InMemoryCache;
}

export class CustomApolloClient {
  readonly client: ApolloClient<NormalizedCacheObject>;
  readonly persistor: CachePersistor<NormalizedCacheObject>;
  readonly evictor: TypePoliciesEvictor<NormalizedCacheObject>;
  readonly cache: InMemoryCache;

  readonly statsLink: StatsLink;
  readonly errorLink: ErrorLink;

  restartSubscriptionClient: () => void;
  private restartRequested;

  constructor({ cache, persistor }: CustomApolloClientParams) {
    this.cache = cache;
    this.persistor = persistor;

    this.evictor = new TypePoliciesEvictor({
      cache,
      typePolicies,
    });

    const typeLink = new TypeLink({
      typePolicies,
    });

    const httpLink = new HttpLink({
      uri: HTTP_URL,
    });

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
      wsClient.terminate();
      this.restartRequested = true;
    };

    const wsClient = createClient({
      url: WS_URL,
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
    });

    const wsLink = new GraphQLWsLink(wsClient);

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
      link: typeLink
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
  writeFragmentNoRetain<TData = unknown, TVariables = unknown>({
    id,
    data,
    fragment,
    fragmentName,
    ...options
  }: DataProxy.WriteFragmentOptions<TData, TVariables>): Reference | undefined {
    const result = this.cache.writeFragment({
      id,
      data,
      fragment,
      fragmentName,
      ...options,
    });
    if (id) {
      this.cache.release(id);
    }
    return result;
  }

  evictUserSpecific(
    userId: string | undefined,
    options?: EvictOptions<NormalizedCacheObject>
  ) {
    withDifferentUserIdInStorage(userId, () => {
      const args: Record<string, unknown[]> = userId
        ? {
            [KeyArguments.UserId]: [userId],
          }
        : {};

      customApolloClient.evictor.evict({
        cache: this.client.cache,
        tag: EvictTag.UserSpecific,
        ...options,
        args: {
          ...args,
          ...options?.args,
        },
      });
    });
  }
}

export const customApolloClient = new CustomApolloClient({ cache, persistor });
