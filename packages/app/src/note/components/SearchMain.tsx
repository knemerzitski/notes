import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';

import { DefaultSearchNotesConnectionGrid } from './DefaultSearchNotesConnectionGrid';
import { NoListResultsTopSpacing } from './NoListResultsTopSpacing';

const _SearchMain_UserFragment = gql(`
  fragment SearchMain_UserFragment on User {
    ...DefaultSearchNotesConnectionGrid_UserFragment
  }
`);

export function SearchMain({
  searchText = '',
  offline = false,
}: {
  searchText?: string;
  offline?: boolean;
}) {
  return (
    <FullWidthCenterMain>
      <FullWidthCenterRow>
        <DefaultSearchNotesConnectionGrid
          searchText={searchText}
          offline={offline}
          NoListComponent={NoListResultsTopSpacing}
        />
      </FullWidthCenterRow>
    </FullWidthCenterMain>
  );
}
