import {
  FieldPolicy,
  FieldReadFunction,
  InMemoryCache,
  TypePolicies,
  TypePolicy,
} from '@apollo/client';
import { Maybe } from '~utils/types';
import { createGraphQLService } from './create/service';
import { MutationDefinition } from './utils/mutation-definition';
import { GateController, GateLink } from './link/gate';
import '@apollo/client';
import { TaggedEvict } from './utils/tagged-evict';
import SerializingLink from 'apollo-link-serialize';
import { PersistLink } from './link/persist';

declare module '@apollo/client' {
  interface DefaultContext {
    [SerializingLink.SERIALIZE]?: string;
    [SerializingLink.SERIALIZE_DIRECTIVE]?: string;
    [GateLink.SKIP]?: boolean;
    [PersistLink.PERSIST]?: boolean | string;
    /**
     * User gate controls whether specific user operations are sent to the server. \
     * If gate is closed then operations are buffered until it's opened.
     */
    getUserGate?: (userId: string) => Pick<GateController, 'open' | 'close'>;
    /**
     * Evict data from cache by tags.
     */
    taggedEvict?: TaggedEvict;
    /**
     * Note id that is tied to fetch createNote
     */
    localNoteId?: string;
    /**
     * Current operation response is from a subscription
     */
    isSubscriptionOperation?: boolean;
  }
}

export enum GlobalOperationVariables {
  USER_ID = '_userId',
}

export interface AppContext {
  /**
   * Current user id
   */
  readonly userId: Maybe<string>;
}

export type TypePoliciesList = (CreateTypePoliciesFn | TypePolicies)[];

export interface TypePoliciesContext {
  /**
   * From AppContext User id used in keyArgs to separate queries per user
   */
  readonly appContext: Pick<AppContext, 'userId'>;
  /**
   * Variable key that can be used in keyArgs to access user id used in request.
   */
  readonly variablesUserIdKey: string;
  /**
   * Cache is currently locked (e.g. when being restored from persistence). Do not modify cache while it's locked.
   *
   */
  readonly isCacheLocked: boolean;
}

export type CreateTypePoliciesFn = (context: TypePoliciesContext) => TypePolicies;
export type CreateTypePolicyFn = (context: TypePoliciesContext) => TypePolicy;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CreateFieldPolicyFn<T = any> = (
  context: TypePoliciesContext
) => FieldPolicy<T> | FieldReadFunction<T>;

/**
 * Invoked when cache is ready (e.g. restored)
 */
export type CacheReadyCallback = (cache: InMemoryCache) => void;
export type CacheReadyCallbacks = CacheReadyCallback[];

export type MutationDefinitions = MutationDefinition[];

export type GraphQLService = ReturnType<typeof createGraphQLService>;

export type GraphQLServiceAction = (service: GraphQLService) => void;
