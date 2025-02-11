import { ColorMode } from '../../__generated__/graphql';

export const colorModes = [
  {
    text: 'Use device theme',
    value: ColorMode.SYSTEM,
  },
  {
    text: 'Light theme',
    value: ColorMode.LIGHT,
  },
  {
    text: 'Dark theme',
    value: ColorMode.DARK,
  },
] as const;
