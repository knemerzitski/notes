import { ApolloCache, Cache } from '@apollo/client';

export enum EvictTag {
  /**
   * User specific fields that needs to be evicted when user is removed.
   *
   * If user specific fields are not evicted then garbage collection will not
   * remove all fields related to user that has already been removed.
   */
  USER_SPECIFIC,
}

interface TaggedEvictOptions {
  tag: EvictTag;
  options: Cache.EvictOptions[];
}

export type TaggedEvictOptionsList = TaggedEvictOptions[];

export type EvictOptionsByTag = Map<EvictTag, Cache.EvictOptions[]>;

export class TaggedEvict {
  private readonly byTag: EvictOptionsByTag = new Map();

  constructor(list?: TaggedEvictOptionsList) {
    if (list) {
      this.add(list);
    }
  }

  add(list: TaggedEvictOptionsList) {
    for (const item of list) {
      let evictOptions = this.byTag.get(item.tag);
      if (!evictOptions) {
        evictOptions = [];
        this.byTag.set(item.tag, evictOptions);
      }
      evictOptions.push(...item.options);
    }
  }

  getByTag(tag: EvictTag) {
    return this.byTag.get(tag);
  }

  evictByTag(
    tag: EvictTag,
    cache: Pick<ApolloCache<unknown>, 'evict'>,
    options?: Pick<Cache.EvictOptions, 'args' | 'broadcast'>
  ) {
    const evictOptionsList = this.getByTag(tag);
    if (!evictOptionsList) return;

    for (const evictOptions of evictOptionsList) {
      cache.evict({
        ...evictOptions,
        ...options,
        args: {
          ...evictOptions.args,
          ...options?.args,
        },
      });
    }
  }
}
