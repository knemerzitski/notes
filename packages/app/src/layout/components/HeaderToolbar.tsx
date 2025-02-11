import { useIsMobile } from '../../theme/context/is-mobile';

import { DesktopHeaderToolbar } from './DesktopHeaderToolbar';
import { MobileHeaderToolbar } from './MobileHeaderToolbar';

export function HeaderToolbar() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileHeaderToolbar />;
  }

  return <DesktopHeaderToolbar />;
}
