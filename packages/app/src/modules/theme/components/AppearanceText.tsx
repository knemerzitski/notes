import { ColorMode } from '../../../__generated__/graphql';
import useColorMode from '../../preferences/hooks/useColorMode';

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

export default function AppearanceText() {
  const [colorMode] = useColorMode();

  const label = labels.find((label) => label.value === colorMode);

  return `Appearance${label ? `: ${label.text}` : ''}`;
}
