import { CreateTypePolicyFn } from '../../graphql/types';

export const DesktopDevicePreferences: CreateTypePolicyFn = function () {
  return {
    fields: {
      appDrawerOpen(existing = false) {
        return existing;
      },
    },
  };
};
