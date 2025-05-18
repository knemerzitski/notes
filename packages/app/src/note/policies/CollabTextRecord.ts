import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { Changeset } from '../scalars/Changeset';
import { Selection } from '../scalars/Selection';

export const CollabTextRecord: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    keyFields: false,
    fields: {
      changeset: Changeset,
      inverse: Changeset,
      selectionInverse: Selection,
      selection: Selection,
    },
  };
};
