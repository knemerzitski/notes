import { CreateTypePolicyFn } from '../../graphql/types';

export const DesktopDevicePreferences: CreateTypePolicyFn = function () {
  return {
    fields: {
      appDrawerOpen(existing = false) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
    },
  };
};
