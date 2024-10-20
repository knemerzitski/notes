import { ColorMode } from '../../__generated__/graphql';
import { useColorMode } from '../hooks/useColorMode';

const colorModes = [
  {
    text: 'Device theme',
    value: ColorMode.SYSTEM,
  },
  {
    text: 'Light',
    value: ColorMode.LIGHT,
  },
  {
    text: 'Dark',
    value: ColorMode.DARK,
  },
] as const;

export function ColorModeText() {
  const [colorMode] = useColorMode();

  const item = colorModes.find(({ value }) => value === colorMode);

  return item?.text ?? colorModes['0'].text;
}
