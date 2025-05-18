import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';
import { isLocalId } from '../../utils/is-local-id';

export const Note: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      localOnly(_existing, { readField }) {
        const id = readField('id');
        return isLocalId(id);
      },
      shareAccess(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      users: fieldArrayToMap('__ref', {
        read(existing = {}) {
          return existing;
        },
      }),
    },
  };
};
