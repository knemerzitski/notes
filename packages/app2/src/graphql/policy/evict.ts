import { ApolloCache, InMemoryCache, Reference, TypePolicies } from '@apollo/client';
import { typenameToRootId, typenameFromId } from '../utils/id';
import { objectValueArrayPermutations } from '~utils/object/object-value-array-permutations';
import { collectShallowCopy } from '~utils/object/collect';

export enum EvictTag {
  CURRENT_USER = 'current_user'
};

export type EvictTypePolicies = Record<string, TypePolicy> & TypePolicies;

interface TypePolicy {
  fields?: Record<string, { evict?: FieldEvict }>;
  evict?: TypeEvict;
}

interface TypeEvict {
  /**
   * Callback when a type was evicted from cache
   */
  evicted?: (value: Reference, options: EvictedOptions) => void;
}

interface FieldEvict {
  /**
   * Custom tag can be specified to group together similar fields
   * so they can be evicted with a single call. Only works with query type.
   */
  tag?: EvictTag;
  /**
   * Every combination of possible static keyArgs. Used for evicting by tag.
   */
  possibleKeyArgs?: Record<string, unknown[]>;
  /**
   * Callback when a type field was evicted from cache
   */
  evicted?: FieldEvictedFn;
}

interface EvictedOptions {
  cache: ApolloCache<unknown>;
  /**
   * Evict is called from optimistic cache
   */
  optimistic: boolean;
}

interface TypeEvictedOptions extends EvictedOptions {
  fieldName: string;
  args?: Record<string, unknown>;
}

type FieldEvictedFn = (value: Reference, options: TypeEvictedOptions) => void;

export interface EvictOptions {
  cache?: ApolloCache<unknown>;
  optimistic?: boolean;
  id?: string;
  fieldName?: string;
  args?: Record<string, unknown>;
  broadcast?: boolean;
}

interface EvictByTagOptions {
  cache?: ApolloCache<unknown>;
  optimistic?: boolean;
  tag: EvictTag;
  args?: Record<string, unknown>;
}

export interface GcOptions {
  cache?: ApolloCache<unknown>;
  optimistic?: boolean;
}

interface EvictInfo {
  id: string;
  fieldName: string;
  evicted?: FieldEvictedFn;
  args?: Record<string, unknown>;
}

export class TypePoliciesEvictor {
  private readonly cache;
  private readonly typePolicies;

  private readonly evictInfoByTag;

  constructor({
    cache,
    typePolicies,
  }: {
    cache: InMemoryCache;
    /**
     * How to handle serialization of a specific type
     * Key is __typename
     */
    typePolicies: EvictTypePolicies;
  }) {
    this.cache = cache;

    this.typePolicies = typePolicies;

    this.evictInfoByTag = Object.entries(typePolicies).reduce<
      Record<string, EvictInfo[]>
    >((map, [__typename, typePolicy]) => {
      if (typePolicy.fields) {
        for (const [fieldName, fieldPolicy] of Object.entries(typePolicy.fields)) {
          const tag = fieldPolicy.evict?.tag;
          if (tag) {
            let arr = map[tag];
            if (!arr) {
              arr = [];
              map[tag] = arr;
            }

            const possibleArgs = collectShallowCopy(
              objectValueArrayPermutations(fieldPolicy.evict?.possibleKeyArgs)
            );
            if (possibleArgs.length > 0) {
              for (const args of possibleArgs) {
                arr.push({
                  fieldName: fieldName,
                  id: typenameToRootId(__typename, this.cache),
                  evicted: fieldPolicy.evict?.evicted,
                  args,
                });
              }
            } else {
              arr.push({
                fieldName: fieldName,
                id: typenameToRootId(__typename, this.cache),
                evicted: fieldPolicy.evict?.evicted,
              });
            }
          }
        }
      }

      return map;
    }, {});
  }

  evict(options: EvictOptions) {
    const cache = options.cache ?? this.cache;

    if (!cache.evict(options)) {
      return false;
    }
    if (!options.id) {
      return true;
    }

    const __typename = typenameToRootId(typenameFromId(options.id), this.cache);
    const typePolicy = this.typePolicies[__typename];
    if (!typePolicy) {
      return true;
    }

    const callbackOptions: EvictedOptions = {
      cache,
      optimistic: options.cache ? (options.optimistic ?? false) : false,
    };

    if (options.fieldName) {
      const fieldPolicy = typePolicy.fields?.[options.fieldName];
      if (!fieldPolicy) return true;
      fieldPolicy.evict?.evicted?.(
        { __ref: options.id },
        {
          ...callbackOptions,
          fieldName: options.fieldName,
        }
      );
    } else {
      typePolicy.evict?.evicted?.({ __ref: options.id }, callbackOptions);
    }

    return true;
  }

  evictByTag(options: EvictByTagOptions) {
    const evictInfo = this.evictInfoByTag[options.tag];
    if (!evictInfo) {
      return;
    }

    const cache = options.cache ?? this.cache;
    const optimistic = options.cache ? (options.optimistic ?? false) : false;

    for (const info of evictInfo) {
      const args =
        info.args != null || options.args != null
          ? {
              ...info.args,
              ...options.args,
            }
          : undefined;
      cache.evict({
        id: info.id,
        fieldName: info.fieldName,
        args,
      });
      info.evicted?.(
        { __ref: info.id },
        {
          cache,
          optimistic,
          fieldName: info.fieldName,
          args,
        }
      );
    }
  }

  gc(options?: GcOptions) {
    const cache = options?.cache ?? this.cache;

    const callbackOptions: EvictedOptions = {
      cache,
      optimistic: options?.cache ? (options.optimistic ?? false) : false,
    };

    const ids = cache.gc();

    for (const id of ids) {
      const __typename = typenameFromId(id);
      const typePolicy = this.typePolicies[__typename];
      typePolicy?.evict?.evicted?.({ __ref: id }, callbackOptions);
    }

    return ids;
  }
}
