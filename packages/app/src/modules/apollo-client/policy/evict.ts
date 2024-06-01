import { ApolloCache } from '@apollo/client';
import objectValueArrayPermutations from '~utils/object/objectValueArrayPermutations';
import { IdentifiedStoreObject, inverseIdentify } from '../utils/identify';
import mapObject from 'map-obj';

export enum EvictTag {
  UserSpecific = 'userSpecific',
}

export type EvictTypePolicies<TCacheShape> = Record<string, EvictTypePolicy<TCacheShape>>;

export interface EvictTypePolicy<TCacheShape> {
  fields?: Record<string, EvictFieldPolicy<TCacheShape>>;
  evict?: {
    /**
     * Custom tag can be specified to group together similar types
     * so they can be evicted with a single call.
     */
    tag?: EvictTag;
    /**
     * Evicted whole type or multiple
     */
    evicted?: (
      objects: IdentifiedStoreObject[],
      options: EvictedTypeOptions<TCacheShape>
    ) => void;
  };
}

export interface EvictFieldPolicy<TCacheShape> {
  evict?: {
    /**
     * Custom tag can be specified to group together similar fields
     * so they can be evicted with a single call.
     */
    tag?: EvictTag;
    /**
     * Every combination of possible static keyArgs that's evicted when using tag.
     */
    possibleKeyArgs?: Record<string, unknown[]>;
    /**
     * Evicted multiple type fields
     */
    evicted?: (
      objects: IdentifiedStoreObject[],
      options: EvictedFieldOptions<TCacheShape>
    ) => void;
  };
}

export interface EvictedTypeOptions<TCacheShape> {
  cache: ApolloCache<TCacheShape>;
}

export interface EvictedFieldOptions<TCacheShape> {
  cache: ApolloCache<TCacheShape>;
  fieldName: string;
}

export interface EvictByTagOptions<TCacheShape> {
  cache?: ApolloCache<TCacheShape>;
  tag?: EvictTag;
  args?: Record<string, unknown>;
}

export interface EvictOptions<TCacheShape> {
  cache?: ApolloCache<TCacheShape>;
  id?: string;
  fieldName?: string;
  broadcast?: boolean;
}

export interface GarbageCollectionOptions<TCacheShape> {
  cache?: ApolloCache<TCacheShape>;
}

const TYPE_MAPPINGS: Record<string, string> = {
  Query: 'ROOT_QUERY',
  Subscription: 'ROOT_SUBSCRIPTION',
  Mutation: 'ROOT_MUTATION',
};

export interface TypePoliciesEvictorParams<TCacheShape> {
  cache: ApolloCache<TCacheShape>;
  typePolicies: EvictTypePolicies<TCacheShape>;
}

export class TypePoliciesEvictor<TCacheShape> {
  private params: TypePoliciesEvictorParams<TCacheShape>;

  constructor(params: TypePoliciesEvictorParams<TCacheShape>) {
    this.params = params;
  }

  evict(options: EvictOptions<TCacheShape>) {
    const { typePolicies } = this.params;
    const cache = options.cache ?? this.params.cache;

    if (!cache.evict(options)) return false;
    if (!options.id) return true;

    const object = inverseIdentify(options.id);
    const __typename = TYPE_MAPPINGS[object.__typename] ?? object.__typename;
    const typePolicy = typePolicies[__typename];
    if (!typePolicy) return true;

    if (options.fieldName) {
      const fieldPolicy = typePolicy.fields?.[options.fieldName];
      if (!fieldPolicy) return true;

      fieldPolicy.evict?.evicted?.([object], { cache, fieldName: options.fieldName });
    } else {
      typePolicy.evict?.evicted?.([object], {
        cache,
      });
    }

    return true;
  }

  evictByTag(options: EvictByTagOptions<TCacheShape>) {
    const { typePolicies } = this.params;
    const cache = options.cache ?? this.params.cache;

    Object.entries(typePolicies).forEach(([__typename, typePolicy]) => {
      if (!typePolicy.fields) return;
      __typename = TYPE_MAPPINGS[__typename] ?? __typename;
      Object.entries(typePolicy.fields).forEach(([fieldName, fieldPolicy]) => {
        const isTagMismatch =
          options.tag != null && fieldPolicy.evict?.tag !== options.tag;
        if (isTagMismatch) {
          return;
        }

        const possibleArgs = {
          ...fieldPolicy.evict?.possibleKeyArgs,
          ...(options.args && mapObject(options.args, (key, value) => [key, [value]])),
        };

        if (Object.keys(possibleArgs).length === 0) {
          cache.evict({
            fieldName,
            id: __typename,
          });
        } else {
          for (const args of objectValueArrayPermutations(possibleArgs)) {
            cache.evict({
              fieldName,
              id: __typename,
              args,
            });
          }
        }
      });
    });
  }

  gc(options?: GarbageCollectionOptions<TCacheShape>) {
    const { typePolicies } = this.params;
    const cache = options?.cache ?? this.params.cache;

    const cacheIds = cache.gc();

    const objectsByTypename = cacheIds.reduce<Map<string, IdentifiedStoreObject[]>>(
      (map, id) => {
        const object = inverseIdentify(id);
        let arr = map.get(object.__typename);
        if (!arr) {
          arr = [];
          map.set(object.__typename, arr);
        }
        arr.push(object);
        return map;
      },
      new Map()
    );

    Object.entries(typePolicies).forEach(([__typename, typePolicy]) => {
      const objects = objectsByTypename.get(__typename);
      if (objects) {
        typePolicy.evict?.evicted?.(objects, {
          cache,
        });
      }
    });

    return cacheIds;
  }
}
