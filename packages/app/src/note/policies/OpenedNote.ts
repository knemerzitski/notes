import { DateTime } from '~/graphql/scalars/DateTime';

import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const OpenedNote: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      closedAt: DateTime,
      collabTextEditing: {
        read(existing = null) {
          return existing;
        },
        merge: true,
      },
    },
  };
};
