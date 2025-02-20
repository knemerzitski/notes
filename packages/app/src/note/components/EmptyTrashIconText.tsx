import DeleteIcon from '@mui/icons-material/Delete';

import { CenterIconText } from './CenterIconText';

export function EmptyTrashIconText() {
  return <CenterIconText icon={<DeleteIcon />} text="You have no trashed notes" />;
}
