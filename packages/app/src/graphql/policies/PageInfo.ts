import { CreateTypePolicyFn } from '../types';

export const PageInfo: CreateTypePolicyFn = function () {
  return {
    fields: {
      hasPreviousPage(existing = false) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      hasNextPage(existing = false) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      startCursor(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      endCursor(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
    },
  };
};
