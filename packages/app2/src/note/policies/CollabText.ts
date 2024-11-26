import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const CollabText: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      recordConnection: {
        keyArgs: false,
      },
    },
  };
};
