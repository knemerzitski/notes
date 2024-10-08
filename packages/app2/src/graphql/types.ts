import {
  ApolloCache,
  DefaultContext,
  DocumentNode,
  InMemoryCache,
  MutationUpdaterFunction,
  OperationVariables,
  TypedDocumentNode,
  TypePolicies,
  TypePolicy,
} from '@apollo/client';
import { Maybe } from '~utils/types';
import { createGraphQLService } from './create/service';

export enum GlobalRequestVariables {
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

/**
 * Invoked when cache is ready (e.g. restored)
 */
export type CacheReadyCallback = (cache: InMemoryCache) => void;
export type CacheReadyCallbacks = CacheReadyCallback[];

export type MutationOperation<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THaveUpdateFn extends boolean = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TVariables = any,
  TContext = DefaultContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCache extends ApolloCache<any> = ApolloCache<any>,
> = {
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>;
} & (THaveUpdateFn extends true
  ? {
      update: MutationUpdaterFunction<
        NoInfer<TData>,
        NoInfer<TVariables>,
        TContext,
        TCache
      >;
    }
  : { update?: never });

export type MutationOperations = MutationOperation[];

export type UpdateHandlersByName = Record<
  string,
  MutationUpdaterFunction<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    OperationVariables,
    DefaultContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ApolloCache<any>
  >
>;

export type GraphQLService = ReturnType<typeof createGraphQLService>;
