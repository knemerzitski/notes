import { ColorMode, LayoutMode } from '../../__generated__/graphql';
import { CreateTypePolicyFn } from '../../graphql/types';

export const DevicePreferences: CreateTypePolicyFn = function () {
  return {
    merge: true,
    fields: {
      colorMode(existing = ColorMode.SYSTEM) {
        return existing;
      },
      layoutMode(existing = LayoutMode.RESPONSIVE) {
        return existing;
      },
      desktop(
        existing = {
          __typename: 'DesktopDevicePreferences',
        }
      ) {
        return existing;
      },
    },
  };
};
