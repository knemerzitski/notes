import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';

import { EmptyInfoTopMargin } from './EmptyInfoTopMargin';
import { SearchNotesConnectionGrid } from './SearchNotesConnectionGrid';

const _SearchMain_UserFragment = gql(`
  fragment SearchMain_UserFragment on User {
    ...SearchNotesConnectionGrid_UserFragment
  }
`);

export function SearchMain({ searchText }: { searchText: string | undefined }) {
  return (
    <FullWidthCenterMain>
      <FullWidthCenterRow>
        <SearchNotesConnectionGrid
          searchText={searchText}
          slots={{
            emptyElementPrefix: <EmptyInfoTopMargin />,
            loadingElementPrefix: <EmptyInfoTopMargin />,
          }}
        />
      </FullWidthCenterRow>
    </FullWidthCenterMain>
  );
}
