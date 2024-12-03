import { ApolloCache, Cache } from '@apollo/client';

import { EvictTag, TaggedEvict } from '../../graphql/utils/tagged-evict';
import { withOverrideCurrentUserId } from '../models/signed-in-user/get-current';

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
