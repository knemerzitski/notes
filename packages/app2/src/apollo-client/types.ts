import { TypePolicies } from '@apollo/client';
import { EvictTypePolicies } from './policy/evict';
import { PersistTypePolicies } from './policy/persist';
import { Maybe } from '~utils/types';

export enum GlobalRequestVariables {
  USER_ID = '_userId',
}

export interface AppContext {
  /**
   * Current user id
   */
  readonly userId: Maybe<string>;
}

export type TypePoliciesList = (CreateTypePoliciesFn | CustomTypePolicies)[];

export type CustomTypePolicies = TypePolicies & PersistTypePolicies & EvictTypePolicies;

export type CustomTypePolicy = CustomTypePolicies extends Record<string,infer R> ? R : never;

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

export type CreateTypePoliciesFn = (context: TypePoliciesContext) => CustomTypePolicies;
