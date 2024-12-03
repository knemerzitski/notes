import { InMemoryCache, TypePolicies } from '@apollo/client';

import { TypePoliciesList, TypePoliciesContext } from '../types';

export function createTypePolicies(
  typePolicies: TypePoliciesList,
  context: TypePoliciesContext
): TypePolicies[] {
  return typePolicies.map((fnOrTyp) =>
    typeof fnOrTyp === 'function' ? fnOrTyp(context) : fnOrTyp
  );
}

export function addTypePolicies(typePolicies: TypePolicies[], cache: InMemoryCache) {
  for (const typePolicy of typePolicies) {
    cache.policies.addTypePolicies(typePolicy);
  }
}
