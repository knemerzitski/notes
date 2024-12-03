import ArchiveIcon from '@mui/icons-material/Archive';

import { EmptyListInfo } from './EmptyListInfo';

export function EmptyArchiveInfo() {
  return <EmptyListInfo icon={<ArchiveIcon />} text="You have no archived notes" />;
}
