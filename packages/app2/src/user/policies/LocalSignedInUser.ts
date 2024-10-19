import { CreateTypePolicyFn } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';

export const LocalSignedInUser: CreateTypePolicyFn = function () {
  return {
    fields: {
      sessionExpired(existing = false) {
        return existing;
      },
      messages: fieldArrayToMap('id'),
    },
  };
};
