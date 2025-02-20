import ArchiveIcon from '@mui/icons-material/Archive';

import { CenterIconText } from './CenterIconText';

export function EmptyArchiveIconText() {
  return <CenterIconText icon={<ArchiveIcon />} text="You have no archived notes" />;
}
