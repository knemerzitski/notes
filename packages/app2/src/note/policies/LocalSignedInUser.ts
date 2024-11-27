import { CreateTypePolicyFn } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';

export const LocalSignedInUser: CreateTypePolicyFn = function () {
  return {
    fields: {
      pendingNotes: fieldArrayToMap('id', {
        read(existing = {}) {
          return existing;
        },
      }),
      unsavedCollabServices: fieldArrayToMap('id', {
        read(existing = {}) {
          return existing;
        },
      }),
    },
  };
};
