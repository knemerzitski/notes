import { TypePolicies } from '@apollo/client';
import { TypePersistors } from '../persistence';

/**
 *
 * @param allPolicies
 * @returns Merged policies by concatenating fields
 */
export default function mergeTypePolicies(
  allPolicies: (TypePolicies & TypePersistors)[]
): TypePolicies & TypePersistors {
  const result: TypePolicies & TypePersistors = {};

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
