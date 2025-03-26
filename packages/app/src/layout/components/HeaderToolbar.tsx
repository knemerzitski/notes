import { gql } from '../../__generated__';
import { useIsAnyNoteSelected } from '../../note/hooks/useIsAnyNoteSelected';
import { useIsMobile } from '../../theme/context/is-mobile';

import { DesktopHeaderToolbar } from './DesktopHeaderToolbar';
import { MobileHeaderToolbar } from './MobileHeaderToolbar';
import { SelectedNotesHeaderToolbar } from './SelectedNotesHeaderToolbar';

const _HeaderToolbar_UserFragment = gql(`
  fragment HeaderToolbar_UserFragment on User {
    ...MobileHeaderToolbar_UserFragment
    ...DesktopHeaderToolbar_UserFragment
  }
`);

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
