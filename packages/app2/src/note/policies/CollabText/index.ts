import { CreateTypePolicyFn, TypePoliciesContext } from '../../../graphql/types';
import { textAtRevision } from './textAtRevision';

export const CollabText: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      recordConnection: {
        keyArgs: false,
        merge(existing, incoming) {
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
