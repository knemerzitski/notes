import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { Selection } from '../scalars/Selection';

export const CollabTextEditing: CreateTypePolicyFn = function (
  _ctx: TypePoliciesContext
) {
  return {
    fields: {
      latestSelection: Selection,
    },
  };
};
