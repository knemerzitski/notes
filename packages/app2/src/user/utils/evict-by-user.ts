import { ApolloCache, Cache } from '@apollo/client';
import { withOverrideCurrentUserId } from './signed-in-user';
import { EvictTag, TaggedEvict } from '../../graphql/utils/tagged-evict';

export function evictByUser(
  userId: string | undefined,
  options: {
    cache: Pick<ApolloCache<unknown>, 'evict'>;
    taggedEvict: TaggedEvict;
    evictOptions?: Pick<Cache.EvictOptions, 'args' | 'broadcast'>;
  }
) {
  withOverrideCurrentUserId(userId, () => {
    options.taggedEvict.evictByTag(
      EvictTag.CURRENT_USER,
      options.cache,
      options.evictOptions
    );
  });
}
