import { ColorMode } from '../../../__generated__/graphql';
import { useColorMode } from '../../preferences/hooks/use-color-mode';

const labels = [
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
];

export function AppearanceText() {
  const [colorMode] = useColorMode();

  const label = labels.find((label) => label.value === colorMode);

  return `Appearance${label ? `: ${label.text}` : ''}`;
}
