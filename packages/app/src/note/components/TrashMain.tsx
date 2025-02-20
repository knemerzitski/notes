import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';

import { NoListResultsTopSpacing } from './NoListResultsTopSpacing';
import { TrashNotesConnectionGrid } from './TrashNotesConnectionGrid';

const _TrashMain_UserFragment = gql(`
  fragment TrashMain_UserFragment on User {
    ...TrashNotesConnectionGrid_UserFragment
  } 
`);

export function TrashMain() {
  return (
    <FullWidthCenterMain>
      <FullWidthCenterRow>
        <TrashNotesConnectionGrid
          slots={{
            emptyElementPrefix: <NoListResultsTopSpacing />,
          }}
        />
      </FullWidthCenterRow>
    </FullWidthCenterMain>
  );
}
