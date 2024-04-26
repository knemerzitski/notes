import { TypePolicies } from '@apollo/client';

/**
 *
 * @param arrayPolicies
 * @returns Merged policies by concatenating fields
 */
export default function mergeArrayTypePolicies(
  arrayPolicies: TypePolicies[]
): TypePolicies {
  const result: TypePolicies = {};

  for (const policies of arrayPolicies) {
    for (const [policyName, policy] of Object.entries(policies)) {
      if (!(policyName in result)) {
        result[policyName] = {};
      }

      const resultPolicy = result[policyName];
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
