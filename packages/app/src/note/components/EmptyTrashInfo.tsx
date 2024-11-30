import { EmptyListInfo } from './EmptyListInfo';
import DeleteIcon from '@mui/icons-material/Delete';

export function EmptyTrashInfo() {
  return <EmptyListInfo icon={<DeleteIcon />} text="You have no trashed notes" />;
}
