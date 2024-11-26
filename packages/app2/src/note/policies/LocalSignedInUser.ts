import { CreateTypePolicyFn } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';

export const LocalSignedInUser: CreateTypePolicyFn = function () {
  return {
    fields: {
      createNotes: fieldArrayToMap('id', {
        read(existing = {}) {
          return existing;
        },
      }),
      unsavedNotes: fieldArrayToMap('id', {
        read(existing = {}) {
          return existing;
        },
      }),
    },
  };
};
