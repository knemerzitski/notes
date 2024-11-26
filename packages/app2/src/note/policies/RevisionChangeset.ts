import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { Changeset } from '../scalars/Changeset';

export const RevisionChangeset: CreateTypePolicyFn = function (
  _ctx: TypePoliciesContext
) {
  return {
    fields: {
      changeset: Changeset,
    },
  };
};
