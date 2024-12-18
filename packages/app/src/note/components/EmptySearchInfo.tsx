import SearchIcon from '@mui/icons-material/Search';

import { EmptyListInfo } from './EmptyListInfo';

export function EmptySearchInfo({ text = 'No notes found' }: { text?: string }) {
  return <EmptyListInfo icon={<SearchIcon />} text={text} />;
}
