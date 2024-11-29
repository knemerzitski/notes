import { LayoutMode } from '../../__generated__/graphql';
import { useLayoutMode } from '../hooks/useLayoutMode';

const layoutModes = [
  {
    text: 'Responsive',
    value: LayoutMode.RESPONSIVE,
  },
  {
    text: 'Desktop',
    value: LayoutMode.DESKTOP,
  },
  {
    text: 'Mobile',
    value: LayoutMode.MOBILE,
  },
] as const;

export function LayoutModeText() {
  const [layoutMode] = useLayoutMode();

  const item = layoutModes.find(({ value }) => value === layoutMode);

  return item?.text ?? layoutModes['0'].text;
}
