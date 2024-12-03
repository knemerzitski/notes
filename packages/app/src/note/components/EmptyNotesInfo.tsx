import NoteIcon from '@mui/icons-material/Note';

import { EmptyListInfo } from './EmptyListInfo';

export function EmptyNotesInfo() {
  return <EmptyListInfo icon={<NoteIcon />} text="Write your first note" />;
}
