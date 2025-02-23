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

export function SearchMain() {
  return (
    <FullWidthCenterMain>
      <FullWidthCenterRow>
        <DefaultSearchNotesConnectionGrid NoListComponent={NoListResultsTopSpacing} />
      </FullWidthCenterRow>
    </FullWidthCenterMain>
  );
}
