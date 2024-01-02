import { ColorMode } from '../../__generated__/graphql';
import { readPreferences, savePreferences } from '../persistence';
import { colorModeVar as defaultColorModeVar } from '../state';

export function useColorMode(
  colorModeVar = defaultColorModeVar,
  persistence = {
    read: readPreferences,
    save: savePreferences,
  }
) {
  function toggleColorMode() {
    const colorMode = colorModeVar();
    const newColorMode = colorMode === ColorMode.Dark ? ColorMode.Light : ColorMode.Dark;
    colorModeVar(newColorMode);

    const preferences = persistence.read();
    preferences.colorMode = newColorMode;
    persistence.save(preferences);
  }

  return {
    operations: {
      toggleColorMode,
    },
  };
}
