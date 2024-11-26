import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { DateTime } from '../../graphql/scalars/DateTime';

export const UserNoteLinkCreate: CreateTypePolicyFn = function (
  _ctx: TypePoliciesContext
) {
  return {
    merge: true,
    fields: {
      movedAt: DateTime,
    },
  };
};
