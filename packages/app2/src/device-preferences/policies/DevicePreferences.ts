import { ColorMode } from '../../__generated__/graphql';
import { CreateTypePolicyFn } from '../../graphql/types';

export const DevicePreferences: CreateTypePolicyFn = function () {
  return {
    fields: {
      colorMode(existing = ColorMode.SYSTEM) {
        return existing;
      },
    },
  };
};
