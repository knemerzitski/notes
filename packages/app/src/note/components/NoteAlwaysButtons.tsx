import { DevSetActiveNoteIdButton } from '../../dev/components/DevSetActiveNoteIdButton';

import { ArchiveOrUnarchiveButton } from './ArchiveOrUnarchiveButton';
import { OpenSharingDialogButton } from './OpenSharingDialogButton';

export function NoteAlwaysButtons() {
  return (
    <>
      <DevSetActiveNoteIdButton />
      <OpenSharingDialogButton />
      <ArchiveOrUnarchiveButton />
    </>
  );
}
