import { ColorMode, LayoutMode } from '../../__generated__/graphql';
import { CreateTypePolicyFn } from '../../graphql/types';

export const DevicePreferences: CreateTypePolicyFn = function () {
  return {
    merge: true,
    fields: {
      colorMode(existing = ColorMode.SYSTEM) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      layoutMode(existing = LayoutMode.RESPONSIVE) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      desktop(
        existing = {
          __typename: 'DesktopDevicePreferences',
        }
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
    },
  };
};
