import { TypePolicies } from '@apollo/client';
import { CustomTypePolicies } from '../init/create-type-policies';

/**
 * @returns Merged policies by concatenating fields with Object.assign
 */
export function mergeTypePolicies(allPolicies: TypePolicies[]): TypePolicies;
export function mergeTypePolicies(allPolicies: CustomTypePolicies[]): CustomTypePolicies {
  const result: CustomTypePolicies = {};

  for (const policies of allPolicies) {
    for (const [type, policy] of Object.entries(policies)) {
      if (!(type in result)) {
        result[type] = {};
      }

      const resultPolicy = result[type];
      if (resultPolicy != null) {
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
  }

  return result;
}
