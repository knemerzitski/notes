import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const CollabTextRecord: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    keyFields: false,
  };
};
