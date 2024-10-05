import {
  ApolloCache,
  MutationUpdaterFunction,
  TypePolicies,
  TypePolicy,
} from '@apollo/client';
import { Maybe } from '~utils/types';
import { createGraphQLService } from './service';

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
}

export type CreateTypePoliciesFn = (context: TypePoliciesContext) => TypePolicies;
export type CreateTypePolicyFn = (context: TypePoliciesContext) => TypePolicy;

export type GraphQLService = ReturnType<typeof createGraphQLService>;

export type UpdateHandlersByName = Record<
  string,
  MutationUpdaterFunction<unknown, unknown, unknown, ApolloCache<unknown>>
>;
