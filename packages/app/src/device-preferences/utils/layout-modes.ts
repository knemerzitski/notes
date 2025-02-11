import { LayoutMode } from '../../__generated__/graphql';

export const layoutModes = [
  {
    text: 'Use responsive layout',
    value: LayoutMode.RESPONSIVE,
  },
  {
    text: 'Desktop layout',
    value: LayoutMode.DESKTOP,
  },
  {
    text: 'Mobile layout',
    value: LayoutMode.MOBILE,
  },
] as const;
