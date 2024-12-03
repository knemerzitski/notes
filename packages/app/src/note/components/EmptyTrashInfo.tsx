import DeleteIcon from '@mui/icons-material/Delete';

import { EmptyListInfo } from './EmptyListInfo';

export function EmptyTrashInfo() {
  return <EmptyListInfo icon={<DeleteIcon />} text="You have no trashed notes" />;
}
