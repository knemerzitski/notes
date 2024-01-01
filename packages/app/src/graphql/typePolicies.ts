import { TypePolicies } from '@apollo/client';

import noteTypePolicies from './note/typePolicies';
import preferencesTypePolicies from './preferences/typePolicies';
import sessionTypePolicies from './session/typePolicies';

/**
 * Define all type policies here
 */
const definedArrayTypePolicies: TypePolicies[] = [
  preferencesTypePolicies,
  sessionTypePolicies,
  noteTypePolicies,
];

/**
 *
 * @param arrayPolicies
 * @returns Merged policies by concatenating fields
 */
function mergeArrayTypePolicies(arrayPolicies: TypePolicies[]): TypePolicies {
  const result: TypePolicies = {};

  for (const policies of arrayPolicies) {
    for (const [policyName, policy] of Object.entries(policies)) {
      if (!(policyName in result)) {
        result[policyName] = {};
      }
      const resultPolicy = result[policyName];

      const { fields, ...allExceptFields } = policy;

      Object.assign(resultPolicy, allExceptFields);

      if (fields) {
        if (!resultPolicy.fields) {
          resultPolicy.fields = {};
        }
        Object.assign(resultPolicy.fields, fields);
      }
    }
  }

  return result;
}

const typePolicies = mergeArrayTypePolicies(definedArrayTypePolicies);

export default typePolicies;
