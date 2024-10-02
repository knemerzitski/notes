import { mergeTypePolicies } from '../utils/merge-type-policies';
import { TypePoliciesList, TypePoliciesContext, CustomTypePolicies } from '../types';

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
