import { TypePolicies, TypePolicy } from '@apollo/client';

export function logFieldRead(policies: TypePolicies) {
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const result = field(...args);
          console.log(`${policyName}.${fieldName}`, result);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return result;
        };
        loggedFields[fieldName] = loggedRead;
      } else {
        const { read, ...allExceptRead } = field;
        if (read) {
          const loggedRead: typeof read = (...args) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = read(...args);
            console.log(`${policyName}.${fieldName}`, result);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return result;
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
