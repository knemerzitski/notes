import { TypePolicies, TypePolicy } from '@apollo/client';

import noteTypePolicies from './note/typePolicies';
import preferencesTypePolicies from './preferences/typePolicies';
import sessionTypePolicies from './session/typePolicies';

const LOG_READ = true;

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

function logFieldRead(policies: TypePolicies) {
  const loggedPolicies: TypePolicies = {};

  for (const [policyName, policy] of Object.entries(policies)) {
    const { fields, ...allExceptFields } = policy;
    if (!fields) continue;

    const loggedFields: Exclude<TypePolicy['fields'], undefined> = {};
    const loggedPolicy: TypePolicy = { ...allExceptFields, fields: loggedFields };
    loggedPolicies[policyName] = loggedPolicy;

    for (const [fieldName, field] of Object.entries(fields)) {
      if (typeof field === 'function') {
        const loggedRead: typeof field = (...args) => {
          console.log(`${policyName}.${fieldName}`);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return field(...args);
        };
        loggedFields[fieldName] = loggedRead;
      } else {
        const { read, ...allExceptRead } = field;
        if (read) {
          const loggedRead: typeof read = (...args) => {
            console.log(`${policyName}.${fieldName}`);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return read(...args);
          };
          loggedFields[fieldName] = {
            ...allExceptRead,
            read: loggedRead,
          };
        }
      }
    }
  }

  return loggedPolicies;
}

let typePolicies = mergeArrayTypePolicies(definedArrayTypePolicies);
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (LOG_READ) {
  typePolicies = logFieldRead(typePolicies);
}

export default typePolicies;
