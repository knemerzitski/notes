import { TypePolicies } from '@apollo/client';
import { EvictTypePolicies } from '../policy/evict';
import { PersistTypePolicies } from '../policy/persist';
import { mergeTypePolicies } from '../utils/merge-type-policies';
import { AppContext } from './app-context';

export type TypePoliciesList = (CreateTypePolicyFn | CustomTypePolicies)[];

export type CustomTypePolicies = TypePolicies & PersistTypePolicies & EvictTypePolicies;

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

export type CreateTypePolicyFn = (context: TypePoliciesContext) => CustomTypePolicies;

export function createTypePolicies(
  typePoliciesList: TypePoliciesList,
  context: TypePoliciesContext
): CustomTypePolicies {
  const typePolicies = typePoliciesList.map((fnOrTyp) =>
    typeof fnOrTyp === 'function' ? fnOrTyp(context) : fnOrTyp
  );

  const mergedTypePolicies = mergeTypePolicies(typePolicies);

  return mergedTypePolicies;
}
