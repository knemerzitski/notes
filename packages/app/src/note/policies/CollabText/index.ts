import { CreateTypePolicyFn, TypePoliciesContext } from '../../../graphql/types';

import { textAtRevision } from './textAtRevision';

export const CollabText: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      recordConnection: {
        keyArgs: false,
        merge(existing, incoming) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return {
            ...existing,
            ...incoming,
          };
        },
      },
      textAtRevision: textAtRevision(ctx),
    },
  };
};
