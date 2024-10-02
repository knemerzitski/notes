import {
  ApolloCache,
  ApolloClient,
  DataProxy,
  InMemoryCache,
  NormalizedCacheObject,
  Reference,
} from '@apollo/client';
import { EvictOptions, EvictTag, GcOptions, TypePoliciesEvictor } from './policy/evict';
import { withOverrideCurrentUserId } from '../user/signed-in-user';
import { WebSocketClient } from './websocket-client';
import { CachePersistor } from 'apollo3-cache-persist';
import { StatsLink } from './link/stats';
import { ErrorLink } from './link/error';

export class CustomApolloClient {
  private readonly _client;
  get client(): Omit<ApolloClient<NormalizedCacheObject>, 'cache' | 'writeFragment'> & {
    cache: Omit<
      ApolloClient<NormalizedCacheObject>['cache'],
      'gc' | 'evict' | 'writeFragment'
    >;
  } {
    return this._client;
  }

  private readonly evictor;

  private readonly wsClient;

  readonly persistor;

  readonly statsLink;
  readonly errorLink;

  constructor({
    client,
    evictor,
    wsClient,
    persistor,
    statsLink,
    errorLink,
  }: {
    client: ApolloClient<NormalizedCacheObject>;
    evictor: Pick<TypePoliciesEvictor, 'gc' | 'evict' | 'evictByTag'>;
    wsClient?: Pick<WebSocketClient, 'restart'>;
    persistor: Pick<CachePersistor<NormalizedCacheObject>, 'persist'>;
    statsLink: Pick<StatsLink, 'byType' | 'eventBus'>;
    errorLink: Pick<ErrorLink, 'eventBus'>;
  }) {
    this._client = client;
    this.evictor = evictor;
    this.wsClient = wsClient;
    this.persistor = persistor;
    this.statsLink = statsLink;
    this.errorLink = errorLink;
  }

  restartSubscriptionClient() {
    this.wsClient?.restart();
  }

  writeFragment<TData = unknown, TVariables = unknown>(
    {
      id,
      data,
      fragment,
      fragmentName,
      ...restOptions
    }: DataProxy.WriteFragmentOptions<TData, TVariables>,
    options?: {
      cache?: ApolloCache<unknown>;
      /**
       * Retain written fragment as root id. It won't be garbage collected.
       * @default false
       */
      retain?: boolean;
    }
  ): Reference | undefined {
    const cache = options?.cache ?? this._client.cache;
    const retain = options?.retain ?? false;

    const ref = cache.writeFragment({
      id,
      data,
      fragment,
      fragmentName,
      ...restOptions,
    });

    if (!retain && id && cache instanceof InMemoryCache) {
      cache.release(id);
    }

    return ref;
  }

  evictByUser(userId: string | undefined, options?: EvictOptions) {
    withOverrideCurrentUserId(userId, () => {
      this.evictor.evictByTag({
        tag: EvictTag.CURRENT_USER,
        ...options,
      });
    });
  }

  evict(options: EvictOptions) {
    return this.evictor.evict(options);
  }

  gc(options?: GcOptions) {
    return this.evictor.gc(options);
  }
}
