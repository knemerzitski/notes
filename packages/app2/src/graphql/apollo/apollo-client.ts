import {
  ApolloCache,
  ApolloClient,
  DataProxy,
  InMemoryCache,
  NormalizedCacheObject,
  Reference,
} from '@apollo/client';
import { EvictOptions, EvictTag, GcOptions, TypePoliciesEvictor } from '../policy/evict';
import { withOverrideCurrentUserId } from '../../user/signed-in-user';

type Client = Omit<ApolloClient<NormalizedCacheObject>, 'cache' | 'writeFragment'> & {
  cache: Cache;
};

type Cache = Omit<
  ApolloClient<NormalizedCacheObject>['cache'],
  'gc' | 'evict' | 'writeFragment'
>;

export class MyApolloClient {
  private readonly _client;
  get client(): Client {
    return this._client;
  }

  get cache(): Cache {
    return this._client.cache;
  }

  private readonly evictor;

  constructor({
    client,
    evictor,
  }: {
    client: ApolloClient<NormalizedCacheObject>;
    evictor: Pick<TypePoliciesEvictor, 'gc' | 'evict' | 'evictByTag'>;
  }) {
    this._client = client;
    this.evictor = evictor;
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
