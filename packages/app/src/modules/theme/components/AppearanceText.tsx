import { ColorMode } from '../../../__generated__/graphql';
import useColorMode from '../../preferences/hooks/useColorMode';

const labels = [
  {
    text: 'Device theme',
    value: ColorMode.System,
  },
  {
    text: 'Light',
    value: ColorMode.Light,
  },
  {
    text: 'Dark',
    value: ColorMode.Dark,
  },
];

export default function AppearanceText() {
  const [colorMode] = useColorMode();

  const label = labels.find((label) => label.value === colorMode);

  return `Appearance${label ? `: ${label.text}` : ''}`;
}
