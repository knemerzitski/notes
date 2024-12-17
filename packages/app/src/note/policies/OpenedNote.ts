import { DateTime } from '../../graphql/scalars/DateTime';

import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const OpenedNote: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      closedAt: DateTime,
      collabTextEditing: {
        read(existing = null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return existing;
        },
        merge: true,
      },
      active(existing, { readField }) {
        const closedAt = readField('closedAt');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        existing = existing ?? closedAt != null;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
    },
  };
};
