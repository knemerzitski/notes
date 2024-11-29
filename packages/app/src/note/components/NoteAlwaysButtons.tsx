import { DevSetActiveNoteIdButton } from '../../dev/components/DevSetActiveNoteIdButton';
import { ArchiveOrUnarchiveButton } from './ArchiveOrUnarchiveButton';



export function NoteAlwaysButtons() {
  // TODO manage sharing button

  return (
    <>
      <DevSetActiveNoteIdButton />
      <ArchiveOrUnarchiveButton />
    </>
  );
}
