import { useIsAnyNoteSelected } from '../../note/hooks/useIsAnyNoteSelected';
import { useIsMobile } from '../../theme/context/is-mobile';

import { DesktopHeaderToolbar } from './DesktopHeaderToolbar';
import { MobileHeaderToolbar } from './MobileHeaderToolbar';
import { SelectedNotesHeaderToolbar } from './SelectedNotesHeaderToolbar';

export function HeaderToolbar() {
  const isMobile = useIsMobile();
  const isAnyNoteSelected = useIsAnyNoteSelected();

  if (isAnyNoteSelected) {
    return <SelectedNotesHeaderToolbar />;
  }

  if (isMobile) {
    return <MobileHeaderToolbar />;
  }

  return <DesktopHeaderToolbar />;
}
