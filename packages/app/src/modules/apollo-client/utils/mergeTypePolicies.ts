import { NormalizedCacheObject, TypePolicies } from '@apollo/client';

import { LinkTypePolicies } from '../links/type-link';
import { EvictTypePolicies } from '../policy/evict';
import { PersistTypePolicies } from '../policy/persist';

type AllTypePolicies = TypePolicies &
  PersistTypePolicies &
  EvictTypePolicies<NormalizedCacheObject> &
  LinkTypePolicies<NormalizedCacheObject>;

/**
 *
 * @param allPolicies
 * @returns Merged policies by concatenating fields
 */
export default function mergeTypePolicies(
  allPolicies: AllTypePolicies[]
): AllTypePolicies {
  const result: AllTypePolicies = {};

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
