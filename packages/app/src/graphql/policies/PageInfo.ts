import { CreateTypePolicyFn } from '../types';

export const PageInfo: CreateTypePolicyFn = function () {
  return {
    fields: {
      hasPreviousPage(existing = false) {
        return existing;
      },
      hasNextPage(existing = false) {
        return existing;
      },
      startCursor(existing = null) {
        return existing;
      },
      endCursor(existing = null) {
        return existing;
      },
    },
  };
};
