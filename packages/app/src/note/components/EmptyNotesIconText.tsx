import NoteIcon from '@mui/icons-material/Note';

import { CenterIconText } from './CenterIconText';

export function EmptyNotesIconText() {
  return (
    <CenterIconText
      aria-label="notes list empty"
      icon={<NoteIcon />}
      text="Write your first note"
    />
  );
}
