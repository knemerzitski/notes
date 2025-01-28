import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';

import { ArchiveNotesConnectionGrid } from './ArchiveNotesConnectionGrid';
import { EmptyInfoTopMargin } from './EmptyInfoTopMargin';

const _ArchiveMain_SignedInUserFragment = gql(`
  fragment ArchiveMain_SignedInUserFragment on SignedInUser {
    ...ArchiveNotesConnectionGrid_SignedInUserFragment
  }
`);

export function ArchiveMain() {
  return (
    <FullWidthCenterMain>
      <FullWidthCenterRow>
        <ArchiveNotesConnectionGrid
          slots={{
            emptyElementPrefix: <EmptyInfoTopMargin />,
          }}
        />
      </FullWidthCenterRow>
    </FullWidthCenterMain>
  );
}
