import { EmptyListInfo } from './EmptyListInfo';
import ArchiveIcon from '@mui/icons-material/Archive';

export function EmptyArchiveInfo() {
  return <EmptyListInfo icon={<ArchiveIcon />} text="You have no archived notes" />;
}
