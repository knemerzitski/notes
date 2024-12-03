import { CreateTypePolicyFn } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';

export const LocalSignedInUser: CreateTypePolicyFn = function () {
  return {
    fields: {
      sessionExpired(existing = false) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      messages: fieldArrayToMap('id'),
      operations: fieldArrayToMap('id', {
        read(existing = {}) {
          return existing;
        },
      }),
    },
  };
};
