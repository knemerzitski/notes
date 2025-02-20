import SearchIcon from '@mui/icons-material/Search';

import { CenterIconText } from './CenterIconText';

export function SearchResultIconText({ text }: { text: string }) {
  return <CenterIconText icon={<SearchIcon />} text={text} />;
}
