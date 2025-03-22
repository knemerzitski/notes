import {
  FieldPolicy,
  FieldReadFunction,
  InMemoryCache,
  TypePolicies,
  TypePolicy,
} from '@apollo/client';
import SerializingLink from 'apollo-link-serialize';

import { Logger } from '../../../utils/src/logging';

import { CustomTypePoliciesContext } from '../graphql-service';

import { createGraphQLService } from './create/service';
import { GateController, GateLink } from './link/gate';
import { PersistLink } from './link/persist';
import { MutationDefinition } from './utils/mutation-definition';
import { TaggedEvict } from './utils/tagged-evict';

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

    /**
     * Skip adding error to user message.
     * Set this to `true` if error is expected and shouldn't be displayed to user.
     * Doesn't work on `UNAUTHENTICATED` errors.
     * @default false
     */
    skipAddUserMessageOnError?: boolean;
  }
}

export type TypePoliciesList = (CreateTypePoliciesFn | TypePolicies)[];

export interface TypePoliciesContext {
  logger?: Logger;
  custom: CustomTypePoliciesContext;
}

export type CustomTypePoliciesInitContext = Omit<TypePoliciesContext, 'custom'>;

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
