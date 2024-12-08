import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const CollabTextEditing: CreateTypePolicyFn = function (
  _ctx: TypePoliciesContext
) {
  return {
    fields: {},
  };
};
