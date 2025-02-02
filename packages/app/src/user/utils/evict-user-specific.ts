import { ApolloCache, Cache } from '@apollo/client';

import { EvictTag, TaggedEvict } from '../../graphql/utils/tagged-evict';

export function evictUserSpecific(options: {
  cache: Pick<ApolloCache<unknown>, 'evict'>;
  taggedEvict: TaggedEvict;
  evictOptions?: Pick<Cache.EvictOptions, 'args' | 'broadcast'>;
}) {
  options.taggedEvict.evictByTag(
    EvictTag.USER_SPECIFIC,
    options.cache,
    options.evictOptions
  );
}
