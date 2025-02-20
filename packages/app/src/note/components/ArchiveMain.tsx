import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';

import { ArchiveNotesConnectionGrid } from './ArchiveNotesConnectionGrid';
import { NoListResultsTopSpacing } from './NoListResultsTopSpacing';

const _ArchiveMain_UserFragment = gql(`
  fragment ArchiveMain_UserFragment on User {
    ...ArchiveNotesConnectionGrid_UserFragment
  }
`);

export function ArchiveMain() {
  return (
    <FullWidthCenterMain>
      <FullWidthCenterRow>
        <ArchiveNotesConnectionGrid
          slots={{
            emptyElementPrefix: <NoListResultsTopSpacing />,
          }}
        />
      </FullWidthCenterRow>
    </FullWidthCenterMain>
  );
}
