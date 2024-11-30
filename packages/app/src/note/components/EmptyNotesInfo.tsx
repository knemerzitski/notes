import { EmptyListInfo } from './EmptyListInfo';
import NoteIcon from '@mui/icons-material/Note';

export function EmptyNotesInfo() {
  return <EmptyListInfo icon={<NoteIcon />} text="Write your first note" />;
}
