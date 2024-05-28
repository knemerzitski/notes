import { ApolloCache } from '@apollo/client';
import objectValueArrayPermutations from '~utils/object/objectValueArrayPermutations';

export enum EvictTag {
  UserSpecific = 'userSpecific',
}

export type EvictTypePolicies = Record<string, EvictTypePolicy>;

export interface EvictTypePolicy {
  fields?: Record<string, EvictFieldPolicy>;
}

export interface EvictOptions<TCacheShape> {
  cache?: ApolloCache<TCacheShape>;
  tag?: EvictTag;
  args?: Record<string, unknown[]>;
}

export interface EvictFieldPolicy {
  /**
   * Custom tag can be specified to group together similar fields
   * so they can be evicted with a single call.
   */
  evictTag?: EvictTag;
  /**
   * Evict every combination of possible keyArgs
   */
  evictPossibleKeyArgs?: Record<string, unknown[]>;
}

const TYPE_MAPPINGS: Record<string, string> = {
  Query: 'ROOT_QUERY',
  Subscription: 'ROOT_SUBSCRIPTION',
  Mutation: 'ROOT_MUTATION',
};

export interface TypePoliciesEvictorParams<TCacheShape> {
  cache: ApolloCache<TCacheShape>;
  typePolicies: EvictTypePolicies;
}

export class TypePoliciesEvictor<TCacheShape> {
  private params: TypePoliciesEvictorParams<TCacheShape>;

  constructor(params: TypePoliciesEvictorParams<TCacheShape>) {
    this.params = params;
  }

  evict<TCacheShape>(options?: EvictOptions<TCacheShape>) {
    const { typePolicies } = this.params;
    const cache = options?.cache ?? this.params.cache;
    Object.entries(typePolicies).forEach(([__typename, typePolicy]) => {
      if (!typePolicy.fields) return;
      __typename = TYPE_MAPPINGS[__typename] ?? __typename;
      Object.entries(typePolicy.fields).forEach(([fieldName, field]) => {
        const isTagMismatch = options?.tag != null && field.evictTag !== options.tag;
        if (isTagMismatch) {
          return;
        }

        const mergedArgs = {
          ...field.evictPossibleKeyArgs,
          ...options?.args,
        };
        if (Object.keys(mergedArgs).length === 0) {
          cache.evict({
            fieldName,
            id: __typename,
          });
        } else {
          for (const args of objectValueArrayPermutations(mergedArgs)) {
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
}
